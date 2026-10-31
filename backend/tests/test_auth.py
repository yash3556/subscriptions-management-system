from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

import jwt
import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from pymongo.errors import ServerSelectionTimeoutError

from app.core.config import Settings
from app.core.security import hash_token, hash_password, verify_password
from app.models.user import UserRole
from app.schemas.auth import RegisterRequest
from app.services.auth_service import create_user
from app.utils.email import EmailDeliveryError

AUTH_ROOT = "/api/v1/auth"
ORIGIN = "http://localhost:5173"


def register(
    client: TestClient,
    email: str = "customer@example.com",
    password: str = "CustomerPass!9",
) -> dict:
    response = client.post(
        f"{AUTH_ROOT}/register",
        json={"name": "Test Customer", "email": email, "password": password},
        headers={"Origin": ORIGIN},
    )
    return response


def login(
    client: TestClient,
    email: str = "customer@example.com",
    password: str = "CustomerPass!9",
) -> dict:
    response = client.post(
        f"{AUTH_ROOT}/login",
        json={"email": email, "password": password},
        headers={"Origin": ORIGIN},
    )
    return response


def insert_user(
    database,
    *,
    email: str,
    role: UserRole,
    permissions: list[str] | None = None,
) -> dict:
    payload = RegisterRequest(
        name="Test User",
        email=email,
        password="CustomerPass!9",
    )
    return create_user(
        database,
        payload,
        role=role,
        permissions=permissions,
    )


def auth_header(response) -> dict[str, str]:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def csrf_header(client: TestClient) -> dict[str, str]:
    return {
        "X-CSRF-Token": client.cookies.get("brightloop_csrf", ""),
        "Origin": ORIGIN,
    }


def test_registration_creates_customer_with_hashed_password(
    client: TestClient, database
) -> None:
    response = register(client)

    assert response.status_code == 201
    result = response.json()
    assert result["role"] == "CUSTOMER"
    assert result["permissions"] == []
    assert "password" not in result
    record = database.users.find_one({"email": "customer@example.com"})
    assert record["password_hash"] != "CustomerPass!9"
    assert record["password_hash"].startswith("$2b$")
    assert database.users.index_information()["uq_users_email"]["unique"] is True


def test_duplicate_registration_is_case_insensitive(
    client: TestClient,
) -> None:
    assert register(client, "Customer@Example.com").status_code == 201
    response = register(client, "customer@example.com")

    assert response.status_code == 409
    assert response.json()["code"] == "http_409"


@pytest.mark.parametrize(
    "password",
    [
        "Short!9",
        "alllowercase!9",
        "ALLUPPERCASE!9",
        "NoSpecialChar9",
        "A" + "a" * 70 + "!9",
        "NoSpecialCharSpace 9",
    ],
)
def test_registration_rejects_passwords_outside_policy(
    client: TestClient, password: str
) -> None:
    response = register(client, email="invalid@example.com", password=password)
    assert response.status_code == 422


def test_password_hashing_uses_bcrypt_and_verifies_password() -> None:
    password_hash = hash_password("SecurePass!9")
    assert password_hash.startswith("$2b$")
    assert verify_password("SecurePass!9", password_hash)
    assert not verify_password("WrongPassword!9", password_hash)


def test_registration_does_not_allow_role_mass_assignment(
    client: TestClient,
) -> None:
    response = client.post(
        f"{AUTH_ROOT}/register",
        json={
            "name": "Escalation",
            "email": "escalation@example.com",
            "password": "CustomerPass!9",
            "role": "ADMIN",
        },
        headers={"Origin": ORIGIN},
    )
    assert response.status_code == 422


def test_login_returns_access_token_and_httponly_refresh_cookie(
    client: TestClient,
) -> None:
    register(client)
    response = login(client)

    assert response.status_code == 200
    result = response.json()
    assert result["token_type"] == "bearer"
    assert result["expires_in"] == 900
    assert result["user"]["role"] == "CUSTOMER"
    assert "refresh_token" not in result
    cookies = response.headers.get_list("set-cookie")
    assert any("brightloop_refresh=" in cookie and "httponly" in cookie.lower()
               for cookie in cookies)
    assert any("brightloop_csrf=" in cookie for cookie in cookies)


def test_invalid_login_errors_are_generic(client: TestClient) -> None:
    register(client)
    wrong_password = login(client, password="IncorrectPass!9")
    unknown_user = login(client, email="unknown@example.com")

    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json()["detail"] == unknown_user.json()["detail"]


@pytest.mark.parametrize("tamper", ["alter", "malformed", "expired"])
def test_expired_tampered_and_malformed_access_tokens_are_rejected(
    client: TestClient,
    database,
    settings: Settings,
    tamper: str,
) -> None:
    user = insert_user(
        database,
        email=f"{tamper}@example.com",
        role=UserRole.CUSTOMER,
    )
    if tamper == "expired":
        token = jwt.encode(
            {
                "sub": str(user["_id"]),
                "jti": "expired-token",
                "ver": 0,
                "iat": datetime.now(timezone.utc) - timedelta(minutes=5),
                "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
                "iss": settings.jwt_issuer,
                "aud": settings.jwt_audience,
            },
            settings.jwt_secret_key,
            algorithm="HS256",
        )
    elif tamper == "malformed":
        token = "not-a-jwt"
    else:
        token = login(client, f"{tamper}@example.com").json()["access_token"]
        token = token[:-1] + ("A" if token[-1] != "A" else "B")

    response = client.get(
        f"{AUTH_ROOT}/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


def test_refresh_rotates_token_and_reuse_revokes_family(
    client: TestClient,
    database,
) -> None:
    register(client)
    logged_in = login(client)
    old_refresh = client.cookies.get("brightloop_refresh")
    headers = csrf_header(client)

    rotated = client.post(f"{AUTH_ROOT}/refresh", headers=headers)
    assert rotated.status_code == 200
    new_refresh = client.cookies.get("brightloop_refresh")
    assert old_refresh and new_refresh and old_refresh != new_refresh
    headers = csrf_header(client)

    replay = client.post(
        f"{AUTH_ROOT}/refresh",
        headers=headers,
        cookies={"brightloop_refresh": old_refresh},
    )
    assert replay.status_code == 401
    next_refresh = client.post(f"{AUTH_ROOT}/refresh", headers=headers)
    assert next_refresh.status_code == 401
    assert logged_in.status_code == 200
    family = database.refresh_tokens.find_one(
        {"used_token_hashes": hash_token(old_refresh)}
    )
    assert family["revoked_at"] is not None


def test_expired_refresh_token_is_rejected(client: TestClient, database) -> None:
    register(client)
    assert login(client).status_code == 200
    raw_token = client.cookies.get("brightloop_refresh")
    database.refresh_tokens.update_one(
        {"current_token_hash": hash_token(raw_token)},
        {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)}},
    )

    response = client.post(
        f"{AUTH_ROOT}/refresh",
        headers=csrf_header(client),
    )
    assert response.status_code == 401


def test_logout_revokes_access_and_refresh_sessions(client: TestClient) -> None:
    register(client)
    logged_in = login(client)
    refresh_cookie = client.cookies.get("brightloop_refresh")
    csrf_cookie = client.cookies.get("brightloop_csrf")
    token_headers = {**auth_header(logged_in), **csrf_header(client)}

    response = client.post(f"{AUTH_ROOT}/logout", headers=token_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out"
    assert client.get(f"{AUTH_ROOT}/me", headers=auth_header(logged_in)).status_code == 401
    revoked = client.post(
        f"{AUTH_ROOT}/refresh",
        headers={"X-CSRF-Token": csrf_cookie or "", "Origin": ORIGIN},
        cookies={
            "brightloop_refresh": refresh_cookie or "",
            "brightloop_csrf": csrf_cookie or "",
        },
    )
    assert revoked.status_code == 401


def test_refresh_requires_csrf_proof(client: TestClient) -> None:
    response = client.post(f"{AUTH_ROOT}/refresh")
    assert response.status_code == 403
    assert response.json()["code"] == "http_403"


def test_forgot_password_is_generic_and_reset_token_is_single_use(
    client: TestClient,
    database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    register(client)
    original_session = login(client)
    original_refresh = client.cookies.get("brightloop_refresh")
    original_csrf = client.cookies.get("brightloop_csrf")
    sent_links: list[str] = []

    def capture_email(_settings, _recipient: str, link: str) -> None:
        sent_links.append(link)

    monkeypatch.setattr(
        "app.routes.auth.send_password_reset_email",
        capture_email,
    )
    existing = client.post(
        f"{AUTH_ROOT}/forgot-password",
        json={"email": "customer@example.com"},
    )
    missing = client.post(
        f"{AUTH_ROOT}/forgot-password",
        json={"email": "absent@example.com"},
    )
    assert existing.status_code == missing.status_code == 202
    assert existing.json() == missing.json()
    token = parse_qs(urlsplit(sent_links[0]).query)["token"][0]
    record = database.password_reset_tokens.find_one(
        {"token_hash": hash_token(token)}
    )
    assert record is not None
    assert "token" not in record

    reset_payload = {"token": token, "new_password": "ChangedPass!9"}
    reset = client.post(f"{AUTH_ROOT}/reset-password", json=reset_payload)
    reused = client.post(f"{AUTH_ROOT}/reset-password", json=reset_payload)
    assert reset.status_code == 200
    assert reused.status_code == 400
    assert client.get(
        f"{AUTH_ROOT}/me",
        headers=auth_header(original_session),
    ).status_code == 401
    refresh_after_reset = client.post(
        f"{AUTH_ROOT}/refresh",
        headers={
            "X-CSRF-Token": original_csrf or "",
            "Origin": ORIGIN,
        },
        cookies={
            "brightloop_refresh": original_refresh or "",
            "brightloop_csrf": original_csrf or "",
        },
    )
    assert refresh_after_reset.status_code == 401
    assert login(client).status_code == 401
    assert login(client, password="ChangedPass!9").status_code == 200


def test_expired_password_reset_token_is_rejected(
    client: TestClient,
    database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    register(client)
    sent_links: list[str] = []
    monkeypatch.setattr(
        "app.routes.auth.send_password_reset_email",
        lambda _settings, _recipient, link: sent_links.append(link),
    )
    client.post(
        f"{AUTH_ROOT}/forgot-password",
        json={"email": "customer@example.com"},
    )
    token = parse_qs(urlsplit(sent_links[0]).query)["token"][0]
    database.password_reset_tokens.update_one(
        {"token_hash": hash_token(token)},
        {"$set": {"expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)}},
    )

    response = client.post(
        f"{AUTH_ROOT}/reset-password",
        json={"token": token, "new_password": "ChangedPass!9"},
    )
    assert response.status_code == 400


def test_smtp_failure_does_not_leak_account_existence(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    register(client)

    def fail_delivery(*_args, **_kwargs) -> None:
        raise EmailDeliveryError("private smtp error")

    monkeypatch.setattr("app.routes.auth.send_password_reset_email", fail_delivery)
    registered = client.post(
        f"{AUTH_ROOT}/forgot-password",
        json={"email": "customer@example.com"},
    )
    unknown = client.post(
        f"{AUTH_ROOT}/forgot-password",
        json={"email": "unknown@example.com"},
    )
    assert registered.status_code == unknown.status_code == 202
    assert registered.json() == unknown.json()
    assert "private smtp error" not in registered.text


def test_only_admin_can_create_staff_and_permissions_are_enforced(
    client: TestClient,
    database,
) -> None:
    customer = insert_user(
        database,
        email="customer@example.com",
        role=UserRole.CUSTOMER,
    )
    customer_login = login(client)
    payload = {
        "name": "Staff One",
        "email": "staff@example.com",
        "password": "StaffPass!9",
        "permissions": [],
    }
    denied = client.post(
        "/api/v1/staff",
        json=payload,
        headers=auth_header(customer_login),
    )
    assert denied.status_code == 403

    admin = insert_user(
        database,
        email="admin@example.com",
        role=UserRole.ADMIN,
    )
    admin_login = login(client, "admin@example.com")
    created = client.post(
        "/api/v1/staff",
        json=payload,
        headers=auth_header(admin_login),
    )
    assert created.status_code == 201
    staff_id = created.json()["id"]
    staff_login = login(client, "staff@example.com", "StaffPass!9")
    access_headers = auth_header(staff_login)
    assert client.get("/test/permission", headers=access_headers).status_code == 403

    assigned = client.put(
        f"/api/v1/staff/{staff_id}/permissions",
        json={"permissions": ["invoices:read"]},
        headers=auth_header(admin_login),
    )
    assert assigned.status_code == 200
    assert client.get("/test/permission", headers=access_headers).status_code == 200
    assert database.users.find_one({"_id": ObjectId(staff_id)})["role"] == "INTERNAL_STAFF"
    assert customer["_id"] != admin["_id"]


def test_admin_can_list_read_deactivate_staff_and_invalidate_sessions(
    client: TestClient,
    database,
) -> None:
    admin = insert_user(database, email="admin@example.com", role=UserRole.ADMIN)
    admin_login = login(client, "admin@example.com")
    created = client.post(
        "/api/v1/staff",
        json={
            "name": "Staff One",
            "email": "staff@example.com",
            "password": "StaffPass!9",
            "permissions": [],
        },
        headers=auth_header(admin_login),
    )
    assert created.status_code == 201
    staff_id = created.json()["id"]
    staff_login = login(client, "staff@example.com", "StaffPass!9")

    listed = client.get("/api/v1/staff", headers=auth_header(admin_login))
    detailed = client.get(f"/api/v1/staff/{staff_id}", headers=auth_header(admin_login))
    disabled = client.patch(
        f"/api/v1/staff/{staff_id}/status",
        json={"is_active": False},
        headers=auth_header(admin_login),
    )

    assert listed.status_code == detailed.status_code == 200
    assert len(listed.json()) == 1
    assert disabled.status_code == 200
    assert disabled.json()["is_active"] is False
    assert client.get("/api/v1/auth/me", headers=auth_header(staff_login)).status_code == 401


def test_customer_cannot_access_another_customer_resource(
    client: TestClient,
    database,
) -> None:
    own_user = insert_user(
        database,
        email="owner@example.com",
        role=UserRole.CUSTOMER,
    )
    other_user = insert_user(
        database,
        email="other@example.com",
        role=UserRole.CUSTOMER,
    )
    own_login = login(client, "owner@example.com")

    for resource in ("invoices", "subscriptions"):
        own = client.get(
            f"/test/{resource}/{own_user['_id']}",
            headers=auth_header(own_login),
        )
        other = client.get(
            f"/test/{resource}/{other_user['_id']}",
            headers=auth_header(own_login),
        )
        assert own.status_code == 200
        assert other.status_code == 404


def test_database_failure_returns_sanitized_service_unavailable(
    client: TestClient,
    database,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def unavailable(*_args, **_kwargs):
        raise ServerSelectionTimeoutError("private mongodb connection details")

    monkeypatch.setattr(database.users, "insert_one", unavailable)
    response = register(client)
    assert response.status_code == 503
    assert response.json()["code"] == "database_unavailable"
    assert "private mongodb connection details" not in response.text


def test_login_rate_limit_is_database_backed(
    settings: Settings,
    database,
) -> None:
    limited_settings = settings.model_copy(
        update={"login_rate_limit_attempts": 2}
    )
    from app.main import create_app
    from tests.conftest import FakeMongoConnection

    app = create_app(limited_settings, FakeMongoConnection(database))
    with TestClient(app) as limited_client:
        responses = [
            login(limited_client, email="unknown@example.com")
            for _ in range(3)
        ]
    assert [response.status_code for response in responses] == [401, 401, 429]
    assert all("unknown@example.com" not in str(record)
               for record in database.auth_rate_limits.find())