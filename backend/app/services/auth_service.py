from __future__ import annotations

import hashlib
import hmac
import math
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, Request
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError
from pymongo.database import Database

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.user import UserRole
from app.schemas.auth import RegisterRequest

def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user.get("_id", user.get("id"))),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "permissions": list(user.get("permissions", [])),
        "is_active": bool(user.get("is_active", False)),
        "created_at": user["created_at"],
    }


def create_user(
    database: Database,
    payload: RegisterRequest,
    *,
    role: UserRole = UserRole.CUSTOMER,
    permissions: list[str] | None = None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    user = {
        "name": payload.name,
        "email": str(payload.email).strip().casefold(),
        "password_hash": hash_password(payload.password),
        "role": role.value,
        "permissions": sorted(set(permissions or [])),
        "is_active": True,
        "token_version": 0,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = database.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        ) from None
    user["_id"] = result.inserted_id
    return user


def _login_bucket_key(
    request: Request,
    email: str,
    settings: Settings,
    now: datetime,
) -> tuple[str, str]:
    ip_address = request.client.host if request.client else "unknown"
    bucket = math.floor(now.timestamp() / settings.login_rate_limit_window_seconds)
    secret = settings.jwt_secret_key.encode("utf-8")
    identities = (
        f"email:{bucket}:{email}".encode("utf-8"),
        f"ip:{bucket}:{ip_address}".encode("utf-8"),
    )
    email_key, ip_key = (
        hmac.new(secret, identity, hashlib.sha256).hexdigest()
        for identity in identities
    )
    return email_key, ip_key


def _record_login_attempt(
    database: Database,
    key: str,
    settings: Settings,
    now: datetime,
) -> int:
    bucket = math.floor(now.timestamp() / settings.login_rate_limit_window_seconds)
    expires_at = datetime.fromtimestamp(
        (bucket + 2) * settings.login_rate_limit_window_seconds,
        tz=timezone.utc,
    )
    try:
        record = database.auth_rate_limits.find_one_and_update(
            {"_id": key},
            {
                "$inc": {"attempts": 1},
                "$setOnInsert": {"expires_at": expires_at},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        record = database.auth_rate_limits.find_one_and_update(
            {"_id": key},
            {"$inc": {"attempts": 1}},
            return_document=ReturnDocument.AFTER,
        )
    if record is None:
        raise PyMongoError("Login rate-limit counter update failed")
    return int(record["attempts"])


def create_session(
    database: Database,
    user: dict[str, Any],
    settings: Settings,
) -> tuple[str, str, datetime]:
    now = datetime.now(timezone.utc)
    refresh_token = create_refresh_token()
    expires_at = now + timedelta(days=settings.refresh_token_expire_days)
    database.refresh_tokens.insert_one(
        {
            "_id": secrets.token_urlsafe(24),
            "user_id": user["_id"],
            "token_version": user.get("token_version", 0),
            "current_token_hash": hash_token(refresh_token),
            "used_token_hashes": [],
            "created_at": now,
            "expires_at": expires_at,
            "revoked_at": None,
        }
    )
    access_token, _, _ = create_access_token(
        str(user["_id"]),
        settings,
        token_version=user.get("token_version", 0),
        now=now,
    )
    return access_token, refresh_token, expires_at


def login(
    database: Database,
    email: str,
    password: str,
    request: Request,
    settings: Settings,
) -> tuple[dict[str, Any], str, str, datetime]:
    normalized_email = email.strip().casefold()
    now = datetime.now(timezone.utc)
    bucket_keys = _login_bucket_key(request, normalized_email, settings, now)
    attempts = [
        _record_login_attempt(database, key, settings, now) for key in bucket_keys
    ]
    if max(attempts) > settings.login_rate_limit_attempts:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again later",
            headers={"Retry-After": str(settings.login_rate_limit_window_seconds)},
        )

    user = database.users.find_one({"email": normalized_email})
    password_is_valid = verify_password(
        password,
        user.get("password_hash") if user else None,
    )
    if not password_is_valid or user is None or not user.get("is_active", False):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    database.auth_rate_limits.delete_many({"_id": {"$in": bucket_keys}})
    access_token, refresh_token, refresh_expires_at = create_session(
        database, user, settings
    )
    return user, access_token, refresh_token, refresh_expires_at


def rotate_refresh_token(
    database: Database,
    refresh_token: str,
    settings: Settings,
) -> tuple[dict[str, Any], str, str, datetime]:
    now = datetime.now(timezone.utc)
    old_hash = hash_token(refresh_token)
    family = database.refresh_tokens.find_one(
        {
            "current_token_hash": old_hash,
            "revoked_at": None,
            "expires_at": {"$gt": now},
        }
    )
    if family is None:
        reused_family = database.refresh_tokens.find_one(
            {"used_token_hashes": old_hash}
        )
        if reused_family is not None:
            database.refresh_tokens.update_one(
                {"_id": reused_family["_id"], "revoked_at": None},
                {"$set": {"revoked_at": now}},
            )
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = database.users.find_one(
        {"_id": family["user_id"], "is_active": True}
    )
    if user is None or family.get("token_version", 0) != user.get(
        "token_version", 0
    ):
        database.refresh_tokens.update_one(
            {"_id": family["_id"]},
            {"$set": {"revoked_at": now}},
        )
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    replacement = create_refresh_token()
    rotated_family = database.refresh_tokens.find_one_and_update(
        {
            "_id": family["_id"],
            "current_token_hash": old_hash,
            "revoked_at": None,
            "expires_at": {"$gt": now},
        },
        {
            "$set": {"current_token_hash": hash_token(replacement)},
            "$push": {"used_token_hashes": old_hash},
        },
        return_document=ReturnDocument.AFTER,
    )
    if rotated_family is None:
        observed_family = database.refresh_tokens.find_one(
            {"_id": family["_id"], "used_token_hashes": old_hash}
        )
        if observed_family is not None:
            database.refresh_tokens.update_one(
                {"_id": family["_id"], "revoked_at": None},
                {"$set": {"revoked_at": now}},
            )
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token, _, _ = create_access_token(
        str(user["_id"]),
        settings,
        token_version=user.get("token_version", 0),
        now=now,
    )
    return user, access_token, replacement, rotated_family["expires_at"]


def revoke_user_sessions(database: Database, user_id: ObjectId) -> None:
    now = datetime.now(timezone.utc)
    database.users.update_one(
        {"_id": user_id},
        {"$inc": {"token_version": 1}, "$set": {"updated_at": now}},
    )
    database.refresh_tokens.update_many(
        {"user_id": user_id, "revoked_at": None},
        {"$set": {"revoked_at": now}},
    )


def issue_password_reset(
    database: Database,
    email: str,
    settings: Settings,
) -> tuple[str, str] | None:
    user = database.users.find_one({"email": email.strip().casefold()})
    if user is None or not user.get("is_active", False):
        return None

    now = datetime.now(timezone.utc)
    token = create_password_reset_token()
    database.password_reset_tokens.delete_many({"user_id": user["_id"]})
    database.password_reset_tokens.insert_one(
        {
            "user_id": user["_id"],
            "token_hash": hash_token(token),
            "created_at": now,
            "expires_at": now
            + timedelta(minutes=settings.password_reset_token_expire_minutes),
            "used_at": None,
        }
    )
    return token, user["email"]


def consume_password_reset(
    database: Database,
    token: str,
    new_password: str,
) -> None:
    now = datetime.now(timezone.utc)
    reset_record = database.password_reset_tokens.find_one_and_update(
        {
            "token_hash": hash_token(token),
            "used_at": None,
            "expires_at": {"$gt": now},
        },
        {"$set": {"used_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if reset_record is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user_id = reset_record["user_id"]
    updated = database.users.update_one(
        {"_id": user_id, "is_active": True},
        {
            "$set": {
                "password_hash": hash_password(new_password),
                "updated_at": now,
            },
            "$inc": {"token_version": 1},
        },
    )
    if updated.matched_count != 1:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    database.refresh_tokens.update_many(
        {"user_id": user_id, "revoked_at": None},
        {"$set": {"revoked_at": now}},
    )
    database.password_reset_tokens.delete_many(
        {"user_id": user_id, "used_at": None}
    )