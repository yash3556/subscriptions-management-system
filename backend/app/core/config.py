from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal, Self
from urllib.parse import urlsplit

from pydantic import EmailStr, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Brightloop Subscription Management API"
    app_env: str = "development"
    log_level: str = "INFO"

    mongodb_uri: str = Field(min_length=1)
    mongodb_database: str = Field(default="brightloop", min_length=1)
    mongodb_server_selection_timeout_ms: int = Field(default=3000, gt=0, le=120_000)
    mongodb_connect_timeout_ms: int = Field(default=3000, gt=0, le=120_000)
    mongodb_socket_timeout_ms: int = Field(default=5000, gt=0, le=120_000)
    mongodb_wait_queue_timeout_ms: int = Field(default=3000, gt=0, le=120_000)
    request_timeout_seconds: float = Field(default=15, gt=0, le=300)
    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_issuer: str = Field(default="brightloop-api", min_length=1)
    jwt_audience: str = Field(default="brightloop-frontend", min_length=1)
    access_token_expire_minutes: int = Field(default=15, gt=0, le=120)
    refresh_token_expire_days: int = Field(default=7, gt=0, le=90)
    password_reset_token_expire_minutes: int = Field(default=30, gt=0, le=120)
    auth_cookie_secure: bool | None = None
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    login_rate_limit_attempts: int = Field(default=5, gt=0, le=100)
    login_rate_limit_window_seconds: int = Field(default=900, gt=0, le=86_400)
    smtp_host: str | None = None
    smtp_port: int = Field(default=587, gt=0, le=65_535)
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: EmailStr = "no-reply@brightloop.example"
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_timeout_seconds: float = Field(default=10, gt=0, le=120)
    password_reset_url: str = "http://localhost:5173/reset-password"

    frontend_allowed_origins: Annotated[
        list[str], NoDecode
    ] = Field(default_factory=lambda: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ])

    @field_validator("mongodb_uri")
    @classmethod
    def validate_mongodb_uri(cls, value: str) -> str:
        uri = value.strip()
        if not uri.startswith(("mongodb://", "mongodb+srv://")):
            raise ValueError("MONGODB_URI must use mongodb:// or mongodb+srv://")
        return uri

    @field_validator("frontend_allowed_origins", mode="before")
    @classmethod
    def parse_frontend_origins(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return value
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value

    @field_validator("frontend_allowed_origins")
    @classmethod
    def validate_frontend_origins(cls, origins: list[str]) -> list[str]:
        normalized: list[str] = []
        for origin in origins:
            candidate = origin.strip().rstrip("/")
            parsed = urlsplit(candidate)
            if (
                candidate == "*"
                or parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
                or parsed.username
                or parsed.password
            ):
                raise ValueError(
                    "Frontend origins must be explicit HTTP(S) origins without paths"
                )
            if candidate not in normalized:
                normalized.append(candidate)
        if not normalized:
            raise ValueError("At least one frontend origin must be configured")
        return normalized

    @model_validator(mode="after")
    def validate_timeout_order(self) -> Self:
        if self.mongodb_connect_timeout_ms > self.mongodb_server_selection_timeout_ms:
            raise ValueError(
                "MongoDB connect timeout cannot exceed server selection timeout"
            )
        if self.smtp_use_tls and self.smtp_use_ssl:
            raise ValueError("SMTP_USE_TLS and SMTP_USE_SSL cannot both be enabled")
        if bool(self.smtp_username) != bool(self.smtp_password):
            raise ValueError("SMTP username and password must be configured together")
        if self.app_env.lower() == "production" and self.auth_cookie_secure is False:
            raise ValueError("Authentication cookies must be Secure in production")
        if self.auth_cookie_secure is None:
            self.auth_cookie_secure = self.app_env.lower() == "production"
        if self.auth_cookie_samesite == "none" and not self.auth_cookie_secure:
            raise ValueError("SameSite=None cookies must be marked Secure")
        if self.app_env.lower() == "production":
            reset_url = urlsplit(self.password_reset_url)
            if reset_url.scheme != "https" or not reset_url.netloc:
                raise ValueError("PASSWORD_RESET_URL must use HTTPS in production")
            if not self.smtp_host:
                raise ValueError("SMTP_HOST is required in production")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()