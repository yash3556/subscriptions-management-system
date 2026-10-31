from __future__ import annotations

import asyncio
import re
import uuid

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.exceptions import error_response
from app.core.logging_config import request_id_context

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class RequestContextMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: FastAPI,
        request_timeout_seconds: float,
    ) -> None:
        super().__init__(app)
        self.request_timeout_seconds = request_timeout_seconds

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        incoming_id = request.headers.get("X-Request-ID", "")
        request_id = (
            incoming_id
            if REQUEST_ID_PATTERN.fullmatch(incoming_id)
            else str(uuid.uuid4())
        )
        request.state.request_id = request_id
        context_token = request_id_context.set(request_id)
        try:
            try:
                response = await asyncio.wait_for(
                    call_next(request),
                    timeout=self.request_timeout_seconds,
                )
            except TimeoutError:
                response = error_response(
                    request,
                    status_code=504,
                    detail="Request timed out",
                    code="request_timeout",
                )
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_context.reset(context_token)


def install_request_middleware(
    app: FastAPI, request_timeout_seconds: float
) -> None:
    app.add_middleware(
        RequestContextMiddleware,
        request_timeout_seconds=request_timeout_seconds,
    )
