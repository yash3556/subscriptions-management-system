from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.permissions import require_admin
from app.models.user import UserRole
from app.schemas.auth import (
    StaffCreateRequest,
    StaffPermissionsRequest,
    StaffStatusRequest,
    UserResponse,
)
from app.services.auth_service import create_user, public_user

router = APIRouter(prefix="/staff", tags=["staff management"])


def _staff_user_or_404(database: Any, user_id: str) -> dict[str, Any]:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="Staff member not found")
    user = database.users.find_one(
        {"_id": ObjectId(user_id), "role": UserRole.INTERNAL_STAFF.value}
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return user


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_staff(
    payload: StaffCreateRequest,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    user = create_user(
        request.app.state.mongo.database,
        payload,
        role=UserRole.INTERNAL_STAFF,
        permissions=payload.permissions,
    )
    return public_user(user)


@router.get("", response_model=list[UserResponse])
def list_staff(
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _admin: dict[str, Any] = Depends(require_admin),
) -> list[dict[str, Any]]:
    cursor = (
        request.app.state.mongo.database.users.find(
            {"role": UserRole.INTERNAL_STAFF.value}
        )
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )
    return [public_user(user) for user in cursor]


@router.get("/{user_id}", response_model=UserResponse)
def get_staff(
    user_id: str,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    user = _staff_user_or_404(request.app.state.mongo.database, user_id)
    return public_user(user)


@router.patch("/{user_id}/status", response_model=UserResponse)
def set_staff_status(
    user_id: str,
    payload: StaffStatusRequest,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    database = request.app.state.mongo.database
    user = _staff_user_or_404(database, user_id)
    database.users.update_one(
        {"_id": user["_id"], "role": UserRole.INTERNAL_STAFF.value},
        {
            "$set": {
                "is_active": payload.is_active,
                "updated_at": datetime.now(timezone.utc),
            },
            "$inc": {"token_version": 1},
        },
    )
    database.refresh_tokens.update_many(
        {"user_id": user["_id"], "revoked_at": None},
        {"$set": {"revoked_at": datetime.now(timezone.utc)}},
    )
    return public_user(database.users.find_one({"_id": user["_id"]}))


@router.put("/{user_id}/permissions", response_model=UserResponse)
def update_staff_permissions(
    user_id: str,
    payload: StaffPermissionsRequest,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    database = request.app.state.mongo.database
    user = _staff_user_or_404(database, user_id)
    database.users.update_one(
        {"_id": user["_id"], "role": UserRole.INTERNAL_STAFF.value},
        {
            "$set": {
                "permissions": payload.permissions,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return public_user(database.users.find_one({"_id": user["_id"]}))