from __future__ import annotations

from collections.abc import Callable
from typing import Any

from jwt.exceptions import PyJWTError
from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.permission_catalog import STAFF_PERMISSION_CATALOG
from app.core.security import decode_access_token
from app.models.user import UserRole

_bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()
    try:
        claims = decode_access_token(
            credentials.credentials,
            request.app.state.settings,
        )
        user_id = ObjectId(claims["sub"])
    except (KeyError, TypeError, ValueError, PyJWTError):
        raise _unauthorized() from None

    database = request.app.state.mongo.database
    if database.revoked_access_tokens.find_one({"_id": claims["jti"]}):
        raise _unauthorized()
    user = database.users.find_one({"_id": user_id})
    if (
        user is None
        or not user.get("is_active", False)
        or claims.get("ver") != user.get("token_version", 0)
    ):
        raise _unauthorized()
    user["id"] = str(user["_id"])
    return user


def require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user.get("role") != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user


def require_permission(permission: str) -> Callable[..., dict[str, Any]]:
    if permission not in STAFF_PERMISSION_CATALOG:
        raise ValueError(f"Unsupported permission: {permission}")

    def permission_dependency(
        user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        role = user.get("role")
        if role == UserRole.ADMIN.value:
            return user
        if (
            role != UserRole.INTERNAL_STAFF.value
            or permission not in user.get("permissions", [])
        ):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return permission_dependency


def ensure_customer_owns_resource(
    user: dict[str, Any],
    owner_id: str | ObjectId,
) -> None:
    if user.get("role") != UserRole.CUSTOMER.value:
        return
    if str(owner_id) != str(user.get("id")):
        raise HTTPException(status_code=404, detail="Resource not found")