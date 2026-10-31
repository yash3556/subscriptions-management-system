from __future__ import annotations

import hmac
import logging
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    Response,
)

from app.core.config import Settings
from app.core.permissions import get_current_user
from app.schemas.auth import (
    AuthenticatedResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    UserResponse,
)
from app.services.auth_service import (
    consume_password_reset,
    create_user,
    issue_password_reset,
    login as authenticate,
    public_user,
    revoke_user_sessions,
    rotate_refresh_token,
)
from app.utils.email import (
    EmailDeliveryError,
    build_password_reset_link,
    send_password_reset_email,
)

logger = logging.getLogger("brightloop.auth")
router = APIRouter(prefix="/auth", tags=["authentication"])
_REFRESH_COOKIE = "brightloop_refresh"
_CSRF_COOKIE = "brightloop_csrf"
_CSRF_HEADER = "X-CSRF-Token"


def _settings(request: Request) -> Settings:
    return request.app.state.settings


def _database(request: Request) -> Any:
    return request.app.state.mongo.database


def require_same_origin(request: Request) -> None:
    origin = request.headers.get("Origin")
    if origin is None:
        return
    allowed = {
        candidate.rstrip("/")
        for candidate in request.app.state.settings.frontend_allowed_origins
    }
    if origin.rstrip("/") not in allowed:
        raise HTTPException(status_code=403, detail="Request origin is not allowed")


def require_csrf(request: Request) -> None:
    cookie_token = request.cookies.get(_CSRF_COOKIE, "")
    header_token = request.headers.get(_CSRF_HEADER, "")
    if (
        not cookie_token
        or not header_token
        or not hmac.compare_digest(cookie_token, header_token)
    ):
        raise HTTPException(status_code=403, detail="CSRF validation failed")
    require_same_origin(request)


def _set_auth_cookies(
    response: Response,
    settings: Settings,
    refresh_token: str,
    refresh_expires_at: datetime,
) -> None:
    now = datetime.now(timezone.utc)
    if refresh_expires_at.tzinfo is None:
        refresh_expires_at = refresh_expires_at.replace(tzinfo=timezone.utc)
    else:
        refresh_expires_at = refresh_expires_at.astimezone(timezone.utc)
    max_age = max(0, int((refresh_expires_at - now).total_seconds()))
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        _REFRESH_COOKIE,
        refresh_token,
        max_age=max_age,
        expires=refresh_expires_at,
        httponly=True,
        secure=bool(settings.auth_cookie_secure),
        samesite=settings.auth_cookie_samesite,
        path="/api/v1/auth",
    )
    response.set_cookie(
        _CSRF_COOKIE,
        csrf_token,
        max_age=max_age,
        expires=refresh_expires_at,
        httponly=False,
        secure=bool(settings.auth_cookie_secure),
        samesite=settings.auth_cookie_samesite,
        path="/",
    )


def _clear_auth_cookies(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        _REFRESH_COOKIE,
        path="/api/v1/auth",
        secure=bool(settings.auth_cookie_secure),
        httponly=True,
        samesite=settings.auth_cookie_samesite,
    )
    response.delete_cookie(
        _CSRF_COOKIE,
        path="/",
        secure=bool(settings.auth_cookie_secure),
        httponly=False,
        samesite=settings.auth_cookie_samesite,
    )


def _authenticated_response(
    user: dict[str, Any],
    access_token: str,
    settings: Settings,
) -> AuthenticatedResponse:
    return AuthenticatedResponse(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=public_user(user),
    )


def _deliver_reset_email(settings: Settings, recipient: str, link: str) -> None:
    try:
        send_password_reset_email(settings, recipient, link)
    except EmailDeliveryError as exc:
        logger.warning(
            "password_reset_email_delivery_failed",
            extra={"status": "failed", "exception_type": type(exc).__name__},
        )
    else:
        logger.info(
            "password_reset_email_accepted_by_smtp",
            extra={"status": "accepted_by_smtp"},
        )


@router.get("/csrf", response_model=dict[str, str])
def csrf_token(response: Response, request: Request) -> dict[str, str]:
    token = secrets.token_urlsafe(32)
    settings = _settings(request)
    response.set_cookie(
        _CSRF_COOKIE,
        token,
        httponly=False,
        secure=bool(settings.auth_cookie_secure),
        samesite=settings.auth_cookie_samesite,
        path="/",
    )
    return {"csrf_token": token}


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    dependencies=[Depends(require_same_origin)],
)
def register(payload: RegisterRequest, request: Request) -> dict[str, Any]:
    user = create_user(_database(request), payload)
    return public_user(user)


@router.post(
    "/login",
    response_model=AuthenticatedResponse,
    dependencies=[Depends(require_same_origin)],
)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
) -> AuthenticatedResponse:
    settings = _settings(request)
    user, access_token, refresh_token, refresh_expires_at = authenticate(
        _database(request),
        str(payload.email),
        payload.password,
        request,
        settings,
    )
    _set_auth_cookies(response, settings, refresh_token, refresh_expires_at)
    return _authenticated_response(user, access_token, settings)


@router.post(
    "/refresh",
    response_model=AuthenticatedResponse,
    dependencies=[Depends(require_csrf)],
)
def refresh(request: Request, response: Response) -> AuthenticatedResponse:
    refresh_token = request.cookies.get(_REFRESH_COOKIE)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    settings = _settings(request)
    user, access_token, replacement, expires_at = rotate_refresh_token(
        _database(request),
        refresh_token,
        settings,
    )
    _set_auth_cookies(response, settings, replacement, expires_at)
    return _authenticated_response(user, access_token, settings)


@router.post(
    "/logout",
    response_model=MessageResponse,
    dependencies=[Depends(require_csrf)],
)
def logout(
    request: Request,
    response: Response,
    user: dict[str, Any] = Depends(get_current_user),
) -> MessageResponse:
    revoke_user_sessions(_database(request), user["_id"])
    _clear_auth_cookies(response, _settings(request))
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
def current_user(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return public_user(user)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=202,
    dependencies=[Depends(require_same_origin)],
)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
) -> MessageResponse:
    generic_message = "If the account exists, a reset link will be sent"
    settings = _settings(request)
    reset = issue_password_reset(_database(request), str(payload.email), settings)
    if reset is not None:
        token, recipient = reset
        reset_link = build_password_reset_link(settings.password_reset_url, token)
        background_tasks.add_task(
            _deliver_reset_email,
            settings,
            recipient,
            reset_link,
        )
    return MessageResponse(message=generic_message)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    dependencies=[Depends(require_same_origin)],
)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
) -> MessageResponse:
    consume_password_reset(
        _database(request),
        payload.token,
        payload.new_password,
    )
    return MessageResponse(message="Password reset successfully")