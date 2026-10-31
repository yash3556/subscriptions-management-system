from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.permission_catalog import STAFF_PERMISSION_CATALOG
from app.core.security import validate_password_strength
from app.models.user import UserRole


class RegisterRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "name": "Alex Customer",
                "email": "alex@example.com",
                "password": "SecurePass!9",
            }
        },
    )

    name: Annotated[str, Field(min_length=1, max_length=120)]
    email: EmailStr
    password: Annotated[str, Field(min_length=9, max_length=72)]

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Name must not be blank")
        return normalized

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().casefold()

    @field_validator("password")
    @classmethod
    def enforce_password_rules(cls, value: str) -> str:
        validate_password_strength(value)
        return value


class LoginRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {"email": "alex@example.com", "password": "SecurePass!9"}
        },
    )

    email: EmailStr
    password: Annotated[str, Field(min_length=1, max_length=72)]

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().casefold()


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    permissions: list[str]
    is_active: bool
    created_at: datetime


class AuthenticatedResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().casefold()


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: Annotated[str, Field(min_length=32, max_length=128)]
    new_password: Annotated[str, Field(min_length=9, max_length=72)]

    @field_validator("new_password")
    @classmethod
    def enforce_password_rules(cls, value: str) -> str:
        validate_password_strength(value)
        return value


class MessageResponse(BaseModel):
    message: str


class StaffCreateRequest(RegisterRequest):
    permissions: list[str] = Field(default_factory=list)

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, values: list[str]) -> list[str]:
        invalid = sorted(set(values) - STAFF_PERMISSION_CATALOG)
        if invalid:
            raise ValueError(f"Unknown staff permissions: {', '.join(invalid)}")
        return sorted(set(values))


class StaffStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool


class StaffPermissionsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    permissions: list[str]

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, values: list[str]) -> list[str]:
        invalid = sorted(set(values) - STAFF_PERMISSION_CATALOG)
        if invalid:
            raise ValueError(f"Unknown staff permissions: {', '.join(invalid)}")
        return sorted(set(values))