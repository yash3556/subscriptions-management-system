from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient
from pymongo.errors import ServerSelectionTimeoutError

from app.core.config import Settings
from app.main import create_app


class FakeMongoConnection:
    def __init__(self, *, available: bool = True) -> None:
        self.available = available
        self.connect_calls = 0
        self.check_calls = 0
        self.closed = False

    def connect(self) -> None:
        self.connect_calls += 1
        self.check()

    def check(self) -> None:
        self.check_calls += 1
        if not self.available:
            raise ServerSelectionTimeoutError("simulated database unavailable")

    def close(self) -> None:
        self.closed = True


def test_application_startup_and_shutdown(settings: Settings) -> None:
    mongo = FakeMongoConnection()
    app = create_app(settings, mongo)

    with TestClient(app) as client:
        assert client.get("/health/live").status_code == 200
        assert mongo.connect_calls == 1

    assert mongo.closed


def test_liveness_does_not_depend_on_database(settings: Settings) -> None:
    mongo = FakeMongoConnection(available=False)
    app = create_app(settings, mongo)

    with TestClient(app) as client:
        response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "alive"}


@pytest.mark.parametrize("path", ["/health", "/health/ready"])
def test_readiness_when_database_is_connected(
    settings: Settings, path: str
) -> None:
    app = create_app(settings, FakeMongoConnection())

    with TestClient(app) as client:
        response = client.get(path)

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["database"] == "connected"


def test_readiness_returns_service_unavailable_when_database_is_down(
    settings: Settings,
) -> None:
    app = create_app(settings, FakeMongoConnection(available=False))

    with TestClient(app) as client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["status"] == "not_ready"
    assert response.json()["database"] == "unavailable"
    assert "simulated" not in response.text


def test_settings_reject_invalid_mongodb_uri() -> None:
    with pytest.raises(ValueError):
        Settings(
            _env_file=None,
            mongodb_uri="https://not-a-mongodb-uri",
        )


def test_settings_reject_wildcard_cors_origin() -> None:
    with pytest.raises(ValueError):
        Settings(
            _env_file=None,
            mongodb_uri="mongodb://localhost:27017/test",
            jwt_secret_key="test-signing-key-not-used-outside-tests-123456789",
            frontend_allowed_origins=["*"],
        )


def test_settings_reject_invalid_timeout_configuration() -> None:
    with pytest.raises(ValueError):
        Settings(
            _env_file=None,
            mongodb_uri="mongodb://localhost:27017/test",
            jwt_secret_key="test-signing-key-not-used-outside-tests-123456789",
            mongodb_connect_timeout_ms=5000,
            mongodb_server_selection_timeout_ms=1000,
        )


def test_settings_reject_missing_jwt_secret() -> None:
    with pytest.raises(ValueError):
        Settings(
            _env_file=None,
            mongodb_uri="mongodb://localhost:27017/test",
            jwt_secret_key="",
        )


def test_settings_require_secure_production_cookie_and_reset_url() -> None:
    with pytest.raises(ValueError):
        Settings(
            _env_file=None,
            mongodb_uri="mongodb://localhost:27017/test",
            jwt_secret_key="test-signing-key-not-used-outside-tests-123456789",
            app_env="production",
            auth_cookie_secure=False,
            smtp_host="smtp.example.test",
            password_reset_url="http://app.example.test/reset-password",
        )


def test_cors_allows_configured_origin_and_rejects_unconfigured_origin(
    settings: Settings,
) -> None:
    app = create_app(settings, FakeMongoConnection())
    with TestClient(app) as client:
        allowed = client.options(
            "/health/live",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        disallowed = client.options(
            "/health/live",
            headers={
                "Origin": "https://not-allowed.example",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert allowed.headers["access-control-allow-credentials"] == "true"
    assert disallowed.status_code == 400
    assert "access-control-allow-origin" not in disallowed.headers


def test_unhandled_error_has_consistent_sanitized_response(
    settings: Settings,
) -> None:
    app = create_app(settings, FakeMongoConnection())

    @app.get("/test-error")
    async def raise_error() -> None:
        raise RuntimeError("do-not-return-this-detail")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test-error")

    assert response.status_code == 500
    assert response.json()["code"] == "internal_server_error"
    assert response.json()["detail"] == "An internal server error occurred"
    assert "do-not-return-this-detail" not in response.text


def test_request_id_is_created_and_returned(settings: Settings) -> None:
    app = create_app(settings, FakeMongoConnection())

    with TestClient(app) as client:
        response = client.get("/health/live")

    request_id = response.headers["x-request-id"]
    assert response.json()["status"] == "alive"
    assert response.json().get("request_id") is None
    assert len(request_id) == 36


def test_valid_incoming_request_id_is_preserved(settings: Settings) -> None:
    app = create_app(settings, FakeMongoConnection())

    with TestClient(app) as client:
        response = client.get(
            "/health/ready",
            headers={"X-Request-ID": "trace-123"},
        )

    assert response.headers["x-request-id"] == "trace-123"
    assert response.json()["request_id"] == "trace-123"


def test_invalid_incoming_request_id_is_replaced(settings: Settings) -> None:
    app = create_app(settings, FakeMongoConnection())

    with TestClient(app) as client:
        response = client.get(
            "/health/live",
            headers={"X-Request-ID": "bad value\r\n"},
        )

    assert response.status_code == 200
    assert response.headers["x-request-id"] != "bad value\r\n"


def test_request_timeout_returns_gateway_timeout(settings: Settings) -> None:
    short_timeout_settings = Settings(
        _env_file=None,
        mongodb_uri=settings.mongodb_uri,
        mongodb_database=settings.mongodb_database,
        jwt_secret_key=settings.jwt_secret_key,
        frontend_allowed_origins=settings.frontend_allowed_origins,
        request_timeout_seconds=0.01,
    )
    app = create_app(short_timeout_settings, FakeMongoConnection())

    @app.get("/slow")
    async def slow() -> dict[str, bool]:
        await asyncio.sleep(0.1)
        return {"done": True}

    with TestClient(app) as client:
        response = client.get("/slow")

    assert response.status_code == 504
    assert response.json()["code"] == "request_timeout"
    assert response.headers.get("x-request-id")


def test_validation_error_uses_standard_error_shape(settings: Settings) -> None:
    app = create_app(settings, FakeMongoConnection())

    @app.get("/typed")
    async def typed(value: int) -> dict[str, int]:
        return {"value": value}

    with TestClient(app) as client:
        response = client.get("/typed?value=not-an-integer")

    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"
    assert response.json()["detail"] == "Request validation failed"
    assert "input" not in response.text
