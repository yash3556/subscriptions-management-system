from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pymongo.errors import PyMongoError

logger = logging.getLogger("brightloop.api")


def error_response(
    request: Request,
    *,
    status_code: int,
    detail: str,
    code: str,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": detail,
            "code": code,
            "request_id": getattr(request.state, "request_id", None),
        },
        headers=headers,
    )


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return error_response(
            request,
            status_code=exc.status_code,
            detail=detail,
            code=f"http_{exc.status_code}",
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, _exc: RequestValidationError
    ) -> JSONResponse:
        return error_response(
            request,
            status_code=422,
            detail="Request validation failed",
            code="validation_error",
        )

    @app.exception_handler(PyMongoError)
    async def database_exception_handler(
        request: Request, exc: PyMongoError
    ) -> JSONResponse:
        logger.error(
            "database_operation_failed",
            extra={"exception_type": type(exc).__name__},
        )
        return error_response(
            request,
            status_code=503,
            detail="Database service is temporarily unavailable",
            code="database_unavailable",
        )

    @app.exception_handler(Exception)
    async def unexpected_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.error(
            "unhandled_application_error",
            extra={"exception_type": type(exc).__name__},
        )
        return error_response(
            request,
            status_code=500,
            detail="An internal server error occurred",
            code="internal_server_error",
        )
