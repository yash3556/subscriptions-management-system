from __future__ import annotations

import logging
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError
from starlette.concurrency import run_in_threadpool
from starlette.responses import JSONResponse

from app.core.config import Settings, get_settings
from app.core.exceptions import install_exception_handlers
from app.core.logging_config import configure_logging
from app.core.middleware import install_request_middleware
from app.database.connection import MongoConnection
from app.jobs.recurring_billing import billing_worker
from app.routes.auth import router as auth_router
from app.routes.users import router as staff_router
from app.routes.customers import router as customers_router
from app.routes.products import router as products_router
from app.routes.plans import router as plans_router
from app.routes.quotations import router as quotations_router
from app.routes.subscriptions import router as subscriptions_router
from app.routes.invoices import router as invoices_router
from app.routes.payments import router as payments_router
from app.routes.discounts import router as discounts_router
from app.routes.dashboard import router as dashboard_router

logger = logging.getLogger("brightloop.startup")


def create_app(
    settings: Settings | None = None,
    mongo_connection: MongoConnection | None = None,
) -> FastAPI:
    active_settings = settings or get_settings()
    configure_logging(active_settings.log_level)
    connection = mongo_connection or MongoConnection(active_settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        try:
            connection.connect()
        except PyMongoError as exc:
            logger.error(
                "mongodb_startup_connection_failed",
                extra={"exception_type": type(exc).__name__},
            )
        billing_task = None
        if active_settings.app_env.lower() != "test":
            billing_task = asyncio.create_task(billing_worker(app))
        try:
            yield
        finally:
            if billing_task is not None:
                billing_task.cancel()
                try:
                    await billing_task
                except asyncio.CancelledError:
                    pass
            connection.close()

    app = FastAPI(
        title=active_settings.app_name,
        lifespan=lifespan,
        docs_url="/docs" if active_settings.app_env != "production" else None,
        redoc_url="/redoc" if active_settings.app_env != "production" else None,
        openapi_url="/openapi.json"
        if active_settings.app_env != "production"
        else None,
    )
    app.state.settings = active_settings
    app.state.mongo = connection

    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.frontend_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Request-ID",
            "X-CSRF-Token",
        ],
        expose_headers=["X-Request-ID"],
    )
    install_request_middleware(app, active_settings.request_timeout_seconds)
    install_exception_handlers(app)
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(staff_router, prefix="/api/v1")
    app.include_router(customers_router, prefix="/api/v1")
    app.include_router(products_router, prefix="/api/v1")
    app.include_router(plans_router, prefix="/api/v1")
    app.include_router(quotations_router, prefix="/api/v1")
    app.include_router(subscriptions_router, prefix="/api/v1")
    app.include_router(invoices_router, prefix="/api/v1")
    app.include_router(payments_router, prefix="/api/v1")
    app.include_router(discounts_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")

    @app.get("/health/live", tags=["health"])
    async def liveness() -> dict[str, str]:
        return {"status": "alive"}

    async def readiness(request: Request) -> JSONResponse:
        try:
            await run_in_threadpool(request.app.state.mongo.check)
        except PyMongoError as exc:
            logger.error(
                "mongodb_readiness_check_failed",
                extra={"exception_type": type(exc).__name__},
            )
            return JSONResponse(
                status_code=503,
                content={
                    "status": "not_ready",
                    "database": "unavailable",
                    "request_id": request.state.request_id,
                },
            )
        return JSONResponse(
            status_code=200,
            content={
                "status": "ready",
                "database": "connected",
                "request_id": request.state.request_id,
            },
        )

    app.add_api_route(
        "/health/ready",
        readiness,
        methods=["GET"],
        tags=["health"],
        name="readiness",
    )
    app.add_api_route(
        "/health",
        readiness,
        methods=["GET"],
        tags=["health"],
        name="health",
    )

    return app


app = create_app()