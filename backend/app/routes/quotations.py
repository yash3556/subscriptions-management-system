from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.permissions import get_current_user
from app.models.user import UserRole
from app.schemas.subscription import QuotationCreate, QuotationUpdate
from app.services.business_service import (
	customer_owns,
	get_customer_for_user,
	now_utc,
	require_business_permission,
	serialize_document,
)
from app.services.quotation_service import build_quotation_lines, create_quotation
from app.services.subscription_service import confirm_quotation

router = APIRouter(prefix="/quotations", tags=["quotations"])


def _expire_quotations(database: Any) -> None:
	now = now_utc()
	database.quotations.update_many(
		{"status": "quotation", "valid_until": {"$lte": now}},
		{
			"$set": {"status": "expired", "updated_at": now},
			"$push": {"history": {"status": "expired", "at": now, "actor_id": None}},
		},
	)


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
		notes=payload.notes,
	)
	return serialize_document(quote)


@router.get("")
def list_quotations(
	request: Request,
	status: str | None = Query(default=None, pattern="^(quotation|confirmed|rejected|expired)$"),
	q: str | None = Query(default=None, max_length=120),
	customer_id: str | None = None,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	database = request.app.state.mongo.database
	_expire_quotations(database)
	if user.get("role") == UserRole.CUSTOMER.value:
		customer = get_customer_for_user(database, user)
		query: dict[str, Any] = {"customer_id": customer["_id"]}
	else:
		require_business_permission(user, "quotations:read")
		query = {}
		if customer_id:
			if not ObjectId.is_valid(customer_id):
				raise HTTPException(status_code=404, detail="Customer not found")
			query["customer_id"] = ObjectId(customer_id)
	if status:
		query["status"] = status
	if q and q.strip():
		query["number"] = {"$regex": re.escape(q.strip()), "$options": "i"}
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
	_expire_quotations(database)
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


@router.patch("/{quotation_id}")
def update_quotation(
	quotation_id: str,
	payload: QuotationUpdate,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "quotations:write")
	if not ObjectId.is_valid(quotation_id):
		raise HTTPException(status_code=404, detail="Quotation not found")
	database = request.app.state.mongo.database
	_expire_quotations(database)
	quote = database.quotations.find_one({"_id": ObjectId(quotation_id)})
	if not quote:
		raise HTTPException(status_code=404, detail="Quotation not found")
	if quote.get("status") != "quotation" or quote.get("customer_accepted_at"):
		raise HTTPException(status_code=409, detail="Only unaccepted quotations can be updated")
	changes = payload.model_dump(exclude_unset=True)
	if not changes:
		raise HTTPException(status_code=422, detail="No changes supplied")
	if "lines" in changes:
		lines = build_quotation_lines(
			database,
			[line.model_dump(exclude_none=True) for line in payload.lines or []],
		)
		changes.update({
			"lines": lines,
			"subtotal_paise": sum(line["subtotal_paise"] for line in lines),
			"tax_paise": sum(line["tax_paise"] for line in lines),
			"total_paise": sum(line["total_paise"] for line in lines),
		})
	if "validity_days" in changes:
		changes["valid_until"] = now_utc() + timedelta(days=changes["validity_days"])
	changes["updated_at"] = now_utc()
	now = now_utc()
	result = database.quotations.update_one(
		{
			"_id": quote["_id"],
			"status": "quotation",
			"customer_accepted_at": None,
			"valid_until": {"$gt": now},
		},
		{"$set": changes, "$push": {"history": {"status": "quotation", "at": changes["updated_at"], "actor_id": user["_id"]}}},
	)
	if not result.matched_count:
		raise HTTPException(status_code=409, detail="Quotation is expired or already processed")
	return serialize_document(database.quotations.find_one({"_id": quote["_id"]}))


@router.delete("/{quotation_id}", status_code=204)
def delete_quotation(
	quotation_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "quotations:write")
	if not ObjectId.is_valid(quotation_id):
		raise HTTPException(status_code=404, detail="Quotation not found")
	result = request.app.state.mongo.database.quotations.delete_one(
		{"_id": ObjectId(quotation_id), "status": "quotation", "customer_accepted_at": None}
	)
	if not result.deleted_count:
		if not request.app.state.mongo.database.quotations.find_one({"_id": ObjectId(quotation_id)}):
			raise HTTPException(status_code=404, detail="Quotation not found")
		raise HTTPException(status_code=409, detail="Only unaccepted quotations can be deleted")


@router.post("/{quotation_id}/send")
def send_quotation(
	quotation_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "quotations:write")
	if not ObjectId.is_valid(quotation_id):
		raise HTTPException(status_code=404, detail="Quotation not found")
	database = request.app.state.mongo.database
	_expire_quotations(database)
	now = now_utc()
	quote = database.quotations.find_one_and_update(
		{
			"_id": ObjectId(quotation_id),
			"status": "quotation",
			"customer_accepted_at": None,
			"sent_at": {"$exists": False},
			"valid_until": {"$gt": now},
		},
		{"$set": {"sent_at": now, "updated_at": now}, "$push": {"history": {"status": "sent", "at": now, "actor_id": user["_id"]}}},
	)
	if not quote:
		raise HTTPException(status_code=409, detail="Quotation is expired or already processed")
	return serialize_document(database.quotations.find_one({"_id": ObjectId(quotation_id)}))


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
		{"_id": quote["_id"], "status": "quotation", "customer_accepted_at": None, "valid_until": {"$gt": now}},
		{
			"$set": {"customer_accepted_at": now, "updated_at": now},
			"$push": {"history": {"status": "accepted", "at": now, "actor_id": user["_id"]}},
		},
	)
	if not result.matched_count:
		raise HTTPException(status_code=409, detail="Quotation is expired or already processed")
	return serialize_document(database.quotations.find_one({"_id": quote["_id"]}))


@router.post("/{quotation_id}/reject")
def reject_quotation(
	quotation_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	if user.get("role") != UserRole.CUSTOMER.value:
		raise HTTPException(status_code=403, detail="Only the customer can reject a quotation")
	if not ObjectId.is_valid(quotation_id):
		raise HTTPException(status_code=404, detail="Quotation not found")
	database = request.app.state.mongo.database
	quote = database.quotations.find_one({"_id": ObjectId(quotation_id)})
	customer = database.customers.find_one({"_id": quote["customer_id"]}) if quote else None
	if not quote or not customer or not customer_owns(user, customer):
		raise HTTPException(status_code=404, detail="Quotation not found")
	now = now_utc()
	result = database.quotations.update_one(
		{"_id": quote["_id"], "status": "quotation", "customer_accepted_at": None, "valid_until": {"$gt": now}},
		{
			"$set": {"status": "rejected", "rejected_at": now, "updated_at": now},
			"$push": {"history": {"status": "rejected", "at": now, "actor_id": user["_id"]}},
		},
	)
	if not result.matched_count:
		raise HTTPException(status_code=409, detail="Quotation is expired or already processed")
	return serialize_document(database.quotations.find_one({"_id": quote["_id"]}))


@router.post("/{quotation_id}/expire")
def expire_quotation(
	quotation_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "quotations:write")
	if not ObjectId.is_valid(quotation_id):
		raise HTTPException(status_code=404, detail="Quotation not found")
	database = request.app.state.mongo.database
	now = now_utc()
	result = database.quotations.update_one(
		{"_id": ObjectId(quotation_id), "status": "quotation", "valid_until": {"$lte": now}},
		{
			"$set": {"status": "expired", "updated_at": now},
			"$push": {"history": {"status": "expired", "at": now, "actor_id": user["_id"]}},
		},
	)
	if not result.matched_count:
		if not database.quotations.find_one({"_id": ObjectId(quotation_id)}):
			raise HTTPException(status_code=404, detail="Quotation not found")
		raise HTTPException(status_code=409, detail="Quotation has not expired or is already processed")
	return serialize_document(database.quotations.find_one({"_id": ObjectId(quotation_id)}))


@router.post("/{quotation_id}/confirm")
def confirm_quote(
	quotation_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "quotations:write")
	subscription = confirm_quotation(
		request.app.state.mongo.database,
		quotation_id,
		actor_id=user["_id"],
	)
	return serialize_document(subscription)
