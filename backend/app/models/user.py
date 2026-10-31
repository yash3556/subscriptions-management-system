from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import TypedDict


class UserRole(StrEnum):
    ADMIN = "ADMIN"
    INTERNAL_STAFF = "INTERNAL_STAFF"
    CUSTOMER = "CUSTOMER"


class UserDocument(TypedDict, total=False):
    _id: object
    name: str
    email: str
    password_hash: str
    role: UserRole
    permissions: list[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime