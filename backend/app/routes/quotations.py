from __future__ import annotations

from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.permissions import get_current_user
from app.models.user import UserRole
from app.schemas.subscription import QuotationCreate
from app.services.business_service import (
	customer_owns,
	get_customer_for_user,
	now_utc,
	require_business_permission,
	serialize_document,
)
from app.services.quotation_service import create_quotation
from app.services.subscription_service import confirm_quotation

router = APIRouter(prefix="/quotations", tags=["quotations"])


@router.post("", status_code=201)
def request_quotation(
	payload: QuotationCreate,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	database = request.app.state.mongo.database
	if user.get("role") == UserRole.CUSTOMER.value:
		customer = get_customer_for_user(database, user)
	else:
		require_business_permission(user, "quotations:write")
		if not payload.customer_id or not ObjectId.is_valid(payload.customer_id):
			raise HTTPException(status_code=422, detail="A valid customer_id is required")
		customer = database.customers.find_one({"_id": ObjectId(payload.customer_id)})
		if not customer:
			raise HTTPException(status_code=404, detail="Customer not found")
	quote = create_quotation(
		database,
		customer_id=customer["_id"],
		requested_lines=[line.model_dump(exclude_none=True) for line in payload.lines],
		validity_days=payload.validity_days,
		created_by=user["_id"],
	)
	return serialize_document(quote)


@router.get("")
def list_quotations(
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	database = request.app.state.mongo.database
	if user.get("role") == UserRole.CUSTOMER.value:
		customer = get_customer_for_user(database, user)
		query = {"customer_id": customer["_id"]}
	else:
		require_business_permission(user, "quotations:read")
		query = {}
	cursor = database.quotations.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [serialize_document(item) for item in cursor], "page": page, "page_size": page_size}


@router.get("/{quotation_id}")
def get_quotation(
	quotation_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	if not ObjectId.is_valid(quotation_id):
		raise HTTPException(status_code=404, detail="Quotation not found")
	database = request.app.state.mongo.database
	quote = database.quotations.find_one({"_id": ObjectId(quotation_id)})
	if not quote:
		raise HTTPException(status_code=404, detail="Quotation not found")
	customer = database.customers.find_one({"_id": quote["customer_id"]})
	if user.get("role") == UserRole.CUSTOMER.value:
		if not customer or not customer_owns(user, customer):
			raise HTTPException(status_code=404, detail="Quotation not found")
	else:
		require_business_permission(user, "quotations:read")
	return serialize_document(quote)


@router.post("/{quotation_id}/accept")
def accept_quotation(
	quotation_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	if user.get("role") != UserRole.CUSTOMER.value:
		raise HTTPException(status_code=403, detail="Only the customer can accept a quotation")
	if not ObjectId.is_valid(quotation_id):
		raise HTTPException(status_code=404, detail="Quotation not found")
	database = request.app.state.mongo.database
	quote = database.quotations.find_one({"_id": ObjectId(quotation_id)})
	customer = database.customers.find_one({"_id": quote["customer_id"]}) if quote else None
	if not quote or not customer or not customer_owns(user, customer):
		raise HTTPException(status_code=404, detail="Quotation not found")
	now = now_utc()
	result = database.quotations.update_one(
		{"_id": quote["_id"], "status": "quotation", "valid_until": {"$gt": now}},
		{"$set": {"customer_accepted_at": now, "updated_at": now}},
	)
	if not result.matched_count:
		raise HTTPException(status_code=409, detail="Quotation is expired or already processed")
	return serialize_document(database.quotations.find_one({"_id": quote["_id"]}))


@router.post("/{quotation_id}/confirm")
def confirm_quote(
	quotation_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "quotations:write")
	subscription = confirm_quotation(request.app.state.mongo.database, quotation_id)
	return serialize_document(subscription)
