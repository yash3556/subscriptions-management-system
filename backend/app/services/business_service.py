from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from bson import ObjectId
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from app.models.user import UserRole


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def serialize_document(document: dict[str, Any]) -> dict[str, Any]:
    def convert(value: Any) -> Any:
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, list):
            return [convert(item) for item in value]
        if isinstance(value, dict):
            return {key: convert(item) for key, item in value.items()}
        return value

    result = convert(document)
    if "_id" in result:
        result["id"] = result.pop("_id")
    return result


def require_business_permission(user: dict[str, Any], permission: str) -> None:
    if user.get("role") == UserRole.ADMIN.value:
        return
    if (
        user.get("role") != UserRole.INTERNAL_STAFF.value
        or permission not in user.get("permissions", [])
    ):
        raise HTTPException(status_code=403, detail="Insufficient permissions")


def get_customer_for_user(database: Any, user: dict[str, Any]) -> dict[str, Any]:
    if user.get("role") != UserRole.CUSTOMER.value:
        raise HTTPException(status_code=403, detail="Customer account required")
    customer = database.customers.find_one({"user_id": user["_id"]})
    if customer:
        return customer
    document = {
        "user_id": user["_id"],
        "name": user.get("name", "Customer"),
        "email": user["email"],
        "phone": None,
        "billing_address": {},
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        result = database.customers.insert_one(document)
    except DuplicateKeyError:
        customer = database.customers.find_one({"user_id": user["_id"]})
        if customer:
            return customer
        raise HTTPException(status_code=409, detail="Customer profile already exists") from None
    document["_id"] = result.inserted_id
    return document


def resolve_customer(
    database: Any,
    user: dict[str, Any],
    requested_customer_id: str | None,
    permission: str,
) -> dict[str, Any]:
    if user.get("role") == UserRole.CUSTOMER.value:
        return get_customer_for_user(database, user)
    require_business_permission(user, permission)
    if not requested_customer_id or not ObjectId.is_valid(requested_customer_id):
        raise HTTPException(status_code=422, detail="A valid customer_id is required")
    customer = database.customers.find_one({"_id": ObjectId(requested_customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


def customer_owns(user: dict[str, Any], customer: dict[str, Any]) -> bool:
    return user.get("role") != UserRole.CUSTOMER.value or customer.get("user_id") == user.get("_id")


def new_number(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:12].upper()}"


def get_customer_or_404(database: Any, customer_id: str) -> dict[str, Any]:
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = database.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer