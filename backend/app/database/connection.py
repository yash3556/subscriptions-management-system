from __future__ import annotations

from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import Settings
from app.database.indexes import create_indexes


class MongoConnection:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: MongoClient | None = None
        self._indexes_ready = False

    @property
    def database(self) -> Database:
        if self._client is None:
            raise RuntimeError("MongoDB client has not been initialized")
        database = self._client[self._settings.mongodb_database]
        self._ensure_indexes(database)
        return database

    def connect(self) -> None:
        if self._client is None:
            self._client = MongoClient(
                self._settings.mongodb_uri,
                appname="BrightloopSubscriptionManagement",
                connectTimeoutMS=self._settings.mongodb_connect_timeout_ms,
                serverSelectionTimeoutMS=(
                    self._settings.mongodb_server_selection_timeout_ms
                ),
                socketTimeoutMS=self._settings.mongodb_socket_timeout_ms,
                waitQueueTimeoutMS=self._settings.mongodb_wait_queue_timeout_ms,
                tz_aware=True,
            )
        self.check()

    def check(self) -> None:
        if self._client is None:
            raise RuntimeError("MongoDB client has not been initialized")
        self._client.admin.command("ping")
        self._ensure_indexes(self._client[self._settings.mongodb_database])

    def _ensure_indexes(self, database: Database) -> None:
        if not self._indexes_ready:
            create_indexes(database)
            self._indexes_ready = True

    def close(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None
            self._indexes_ready = False