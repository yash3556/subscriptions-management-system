from __future__ import annotations

import argparse
from getpass import getpass

from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.core.config import get_settings
from app.database.connection import MongoConnection
from app.database.indexes import create_indexes
from app.models.user import UserRole
from app.schemas.auth import RegisterRequest
from app.services.auth_service import create_user


def create_initial_admin() -> None:
    settings = get_settings()
    connection = MongoConnection(settings)
    connection.connect()
    database = connection.database
    try:
        create_indexes(database)
        if database.users.count_documents({"role": UserRole.ADMIN.value}):
            raise SystemExit("An administrator already exists; bootstrap refused")

        email = input("Administrator email: ").strip().casefold()
        name = input("Administrator name: ").strip()
        password = getpass("Administrator password: ")
        confirmation = getpass("Confirm password: ")
        if password != confirmation:
            raise SystemExit("Passwords do not match")
        payload = RegisterRequest.model_validate(
            {"name": name, "email": email, "password": password}
        )

        try:
            database.admin_bootstrap.insert_one({"_id": "initial_admin"})
        except DuplicateKeyError:
            raise SystemExit("Administrator bootstrap has already been claimed") from None
        try:
            create_user(database, payload, role=UserRole.ADMIN)
        except (HTTPException, PyMongoError):
            database.admin_bootstrap.delete_one({"_id": "initial_admin"})
            raise
        print(f"Administrator account created for {email}")
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser(
        "create-admin",
        help="Create the first administrator account",
    )
    args = parser.parse_args()
    if args.command == "create-admin":
        create_initial_admin()


if __name__ == "__main__":
    main()
