from __future__ import annotations

import re
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pymongo.errors import DuplicateKeyError

from app.core.permissions import get_current_user
from app.models.user import UserRole
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.business_service import (
	customer_owns,
	get_customer_for_user,
	now_utc,
	require_business_permission,
	serialize_document,
)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/me")
def get_my_customer(request: Request, user: dict[str, Any] = Depends(get_current_user)):
	if user.get("role") == UserRole.CUSTOMER.value:
		customer = get_customer_for_user(request.app.state.mongo.database, user)
		return serialize_document(customer)
	raise HTTPException(status_code=403, detail="Customer account required")


@router.get("")
def list_customers(
	request: Request,
	q: str | None = Query(default=None, max_length=120),
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "customers:read")
	database = request.app.state.mongo.database
	query: dict[str, Any] = {}
	if q and q.strip():
		pattern = re.escape(q.strip())
		query["$or"] = [
			{"name": {"$regex": pattern, "$options": "i"}},
			{"email": {"$regex": pattern, "$options": "i"}},
			{"phone": {"$regex": pattern, "$options": "i"}},
		]
	cursor = database.customers.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [serialize_document(item) for item in cursor], "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_customer(
	payload: CustomerCreate,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "customers:write")
	database = request.app.state.mongo.database
	document = payload.model_dump(exclude={"user_id"})
	document["user_id"] = ObjectId(payload.user_id) if payload.user_id else None
	if document["user_id"]:
		linked_user = database.users.find_one({"_id": document["user_id"], "role": UserRole.CUSTOMER.value})
		if not linked_user:
			raise HTTPException(status_code=404, detail="Customer login account not found")
	document.update({"created_at": now_utc(), "updated_at": now_utc()})
	try:
		result = database.customers.insert_one(document)
	except DuplicateKeyError:
		raise HTTPException(status_code=409, detail="Customer login is already linked") from None
	document["_id"] = result.inserted_id
	return serialize_document(document)


@router.get("/{customer_id}")
def get_customer(
	customer_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	database = request.app.state.mongo.database
	if not ObjectId.is_valid(customer_id):
		raise HTTPException(status_code=404, detail="Customer not found")
	customer = database.customers.find_one({"_id": ObjectId(customer_id)})
	if not customer or not customer_owns(user, customer):
		raise HTTPException(status_code=404, detail="Customer not found")
	if user.get("role") != UserRole.CUSTOMER.value:
		require_business_permission(user, "customers:read")
	return serialize_document(customer)


@router.patch("/{customer_id}")
def update_customer(
	customer_id: str,
	payload: CustomerUpdate,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	database = request.app.state.mongo.database
	if not ObjectId.is_valid(customer_id):
		raise HTTPException(status_code=404, detail="Customer not found")
	customer = database.customers.find_one({"_id": ObjectId(customer_id)})
	if not customer or not customer_owns(user, customer):
		raise HTTPException(status_code=404, detail="Customer not found")
	if user.get("role") == UserRole.CUSTOMER.value:
		if payload.model_fields_set - {"phone", "billing_address", "name"}:
			raise HTTPException(status_code=403, detail="Customer cannot change account links")
	else:
		require_business_permission(user, "customers:write")
	changes = payload.model_dump(exclude_unset=True)
	if not changes:
		raise HTTPException(status_code=422, detail="No changes supplied")
	changes["updated_at"] = now_utc()
	database.customers.update_one({"_id": customer["_id"]}, {"$set": changes})
	return serialize_document(database.customers.find_one({"_id": customer["_id"]}))


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
	customer_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "customers:write")
	if not ObjectId.is_valid(customer_id):
		raise HTTPException(status_code=404, detail="Customer not found")
	database = request.app.state.mongo.database
	customer_object_id = ObjectId(customer_id)
	if not database.customers.find_one({"_id": customer_object_id}):
		raise HTTPException(status_code=404, detail="Customer not found")
	for collection_name in ("quotations", "subscriptions", "invoices", "payments"):
		if database[collection_name].find_one({"customer_id": customer_object_id}, {"_id": 1}):
			raise HTTPException(
				status_code=409,
				detail="Customer has business records and cannot be deleted",
			)
	database.customers.delete_one({"_id": customer_object_id})


def _customer_records(
	customer_id: str,
	request: Request,
	user: dict[str, Any],
	collection_name: str,
	page: int,
	page_size: int,
):
	database = request.app.state.mongo.database
	if user.get("role") == UserRole.CUSTOMER.value:
		customer = get_customer_for_user(database, user)
		if str(customer["_id"]) != customer_id:
			raise HTTPException(status_code=404, detail="Customer not found")
	else:
		require_business_permission(user, "customers:read")
		if not ObjectId.is_valid(customer_id):
			raise HTTPException(status_code=404, detail="Customer not found")
		customer = database.customers.find_one({"_id": ObjectId(customer_id)})
		if not customer:
			raise HTTPException(status_code=404, detail="Customer not found")
	query: dict[str, Any] = {"customer_id": customer["_id"]}
	if collection_name == "payments":
		query["status"] = "recorded"
	sort_field = "recorded_at" if collection_name == "payments" else "created_at"
	cursor = (
		database[collection_name]
		.find(query)
		.sort(sort_field, -1)
		.skip((page - 1) * page_size)
		.limit(page_size)
	)
	return {
		"items": [serialize_document(item) for item in cursor],
		"page": page,
		"page_size": page_size,
	}


@router.get("/{customer_id}/quotations")
def customer_quotations(
	customer_id: str,
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	return _customer_records(customer_id, request, user, "quotations", page, page_size)


@router.get("/{customer_id}/subscriptions")
def customer_subscriptions(
	customer_id: str,
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	return _customer_records(customer_id, request, user, "subscriptions", page, page_size)


@router.get("/{customer_id}/invoices")
def customer_invoices(
	customer_id: str,
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	return _customer_records(customer_id, request, user, "invoices", page, page_size)


@router.get("/{customer_id}/payments")
def customer_payments(
	customer_id: str,
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	return _customer_records(customer_id, request, user, "payments", page, page_size)
