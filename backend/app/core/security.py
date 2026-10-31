from __future__ import annotations

import bcrypt
import jwt
import secrets
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any

from app.core.config import Settings

_DUMMY_PASSWORD_HASH = bcrypt.hashpw(
    b"constant-dummy-password", bcrypt.gensalt(rounds=12)
)


def validate_password_strength(password: str) -> None:
    if len(password) <= 8:
        raise ValueError("Password must be longer than 8 characters")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed bcrypt's 72-byte limit")
    if not any(char.isupper() for char in password):
        raise ValueError("Password must contain an uppercase letter")
    if not any(char.islower() for char in password):
        raise ValueError("Password must contain a lowercase letter")
    if not any(not char.isalnum() and not char.isspace() for char in password):
        raise ValueError("Password must contain a special character")


def hash_password(password: str) -> str:
    validate_password_strength(password)
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode(
        "ascii"
    )


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        candidate_hash = (
            password_hash.encode("ascii")
            if password_hash is not None
            else _DUMMY_PASSWORD_HASH
        )
        return bcrypt.checkpw(password.encode("utf-8"), candidate_hash)
    except (ValueError, TypeError, UnicodeError):
        bcrypt.checkpw(b"invalid-password", _DUMMY_PASSWORD_HASH)
        return False


def create_access_token(
    user_id: str,
    settings: Settings,
    *,
    token_version: int = 0,
    now: datetime | None = None,
) -> tuple[str, str, datetime]:
    issued_at = now or datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(minutes=settings.access_token_expire_minutes)
    token_id = secrets.token_urlsafe(18)
    claims: dict[str, Any] = {
        "sub": user_id,
        "jti": token_id,
        "iat": issued_at,
        "exp": expires_at,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "ver": token_version,
    }
    token = jwt.encode(
        claims,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return token, token_id, expires_at


def decode_access_token(token: str, settings: Settings) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
        options={"require": ["sub", "jti", "iat", "exp", "iss", "aud", "ver"]},
    )


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def create_password_reset_token() -> str:
    return secrets.token_urlsafe(32)