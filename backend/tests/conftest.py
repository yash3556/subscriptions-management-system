from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import mongomock
import pytest
from fastapi import Depends
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.permissions import (
    ensure_customer_owns_resource,
    get_current_user,
    require_permission,
)
from app.database.indexes import create_indexes
from app.main import create_app


class FakeMongoConnection:
    def __init__(self, database: Any) -> None:
        self.database = database
        self.available = True
        self.closed = False

    def connect(self) -> None:
        self.check()
        create_indexes(self.database)

    def check(self) -> None:
        if not self.available:
            raise RuntimeError("Database unavailable")

    def close(self) -> None:
        self.closed = True


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        app_env="test",
        mongodb_uri="mongodb://127.0.0.1:27017/brightloop_test",
        mongodb_database="brightloop_test",
        jwt_secret_key="test-signing-key-not-used-outside-tests-123456789",
        frontend_allowed_origins=["http://localhost:5173"],
        request_timeout_seconds=1,
        mongodb_server_selection_timeout_ms=100,
        mongodb_connect_timeout_ms=100,
        mongodb_socket_timeout_ms=100,
        mongodb_wait_queue_timeout_ms=100,
    )


@pytest.fixture
def database() -> Iterator[Any]:
    client = mongomock.MongoClient(tz_aware=True)
    yield client["brightloop_test"]
    client.close()


@pytest.fixture
def application(settings: Settings, database: Any):
    mongo = FakeMongoConnection(database)
    app = create_app(settings, mongo)

    @app.get("/test/permission")
    def permission_route(
        _user: dict = Depends(require_permission("invoices:read")),
    ) -> dict[str, str]:
        return {"result": "allowed"}

    @app.get("/test/owned/{owner_id}")
    def owned_route(
        owner_id: str,
        user: dict = Depends(get_current_user),
    ) -> dict[str, str]:
        ensure_customer_owns_resource(user, owner_id)
        return {"owner_id": owner_id}

    @app.get("/test/invoices/{owner_id}")
    def owned_invoice_route(
        owner_id: str,
        user: dict = Depends(get_current_user),
    ) -> dict[str, str]:
        ensure_customer_owns_resource(user, owner_id)
        return {"owner_id": owner_id}

    @app.get("/test/subscriptions/{owner_id}")
    def owned_subscription_route(
        owner_id: str,
        user: dict = Depends(get_current_user),
    ) -> dict[str, str]:
        ensure_customer_owns_resource(user, owner_id)
        return {"owner_id": owner_id}

    return app


@pytest.fixture
def client(application) -> Iterator[TestClient]:
    with TestClient(application) as test_client:
        yield test_client
