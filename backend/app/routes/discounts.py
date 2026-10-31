from __future__ import annotations

import re
from datetime import timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.permissions import get_current_user, require_admin
from app.models.user import UserRole
from app.schemas.discount import DiscountCreate, DiscountUpdate
from app.services.business_service import now_utc, require_business_permission, serialize_document

router = APIRouter(prefix="/discounts", tags=["discounts"])


@router.get("")
def list_discounts(
	request: Request,
	q: str | None = Query(default=None, max_length=120),
	is_active: bool | None = None,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	if user.get("role") == UserRole.CUSTOMER.value:
		query: dict[str, Any] = {"is_active": True}
		now = now_utc()
		query["starts_at"] = {"$lte": now}
		query["$or"] = [{"ends_at": None}, {"ends_at": {"$gt": now}}]
	else:
		require_business_permission(user, "discounts:read")
		query = {}
		if is_active is not None:
			query["is_active"] = is_active
	if q and q.strip():
		query["name"] = {"$regex": re.escape(q.strip()), "$options": "i"}
	cursor = request.app.state.mongo.database.discounts.find(query).sort("starts_at", -1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [serialize_document(item) for item in cursor], "page": page, "page_size": page_size}


@router.get("/{discount_id}")
def get_discount(
	discount_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	if not ObjectId.is_valid(discount_id):
		raise HTTPException(status_code=404, detail="Discount not found")
	database = request.app.state.mongo.database
	discount = database.discounts.find_one({"_id": ObjectId(discount_id)})
	if not discount:
		raise HTTPException(status_code=404, detail="Discount not found")
	if user.get("role") == UserRole.CUSTOMER.value:
		now = now_utc()
		if not discount.get("is_active") or discount.get("starts_at", now) > now:
			raise HTTPException(status_code=404, detail="Discount not found")
		if discount.get("ends_at") and discount["ends_at"] <= now:
			raise HTTPException(status_code=404, detail="Discount not found")
	else:
		require_business_permission(user, "discounts:read")
	return serialize_document(discount)


@router.post("", status_code=201)
def create_discount(
	payload: DiscountCreate,
	request: Request,
	_admin: dict[str, Any] = Depends(require_admin),
):
	document = payload.model_dump()
	document["product_ids"] = [ObjectId(value) for value in payload.product_ids]
	if document["product_ids"]:
		found = request.app.state.mongo.database.products.count_documents(
			{"_id": {"$in": document["product_ids"]}}
		)
		if found != len(set(document["product_ids"])):
			raise HTTPException(status_code=404, detail="One or more products were not found")
	document.update({"usage_count": 0, "is_active": True, "created_at": now_utc(), "updated_at": now_utc()})
	result = request.app.state.mongo.database.discounts.insert_one(document)
	document["_id"] = result.inserted_id
	return serialize_document(document)


@router.patch("/{discount_id}")
def update_discount(
	discount_id: str,
	payload: DiscountUpdate,
	request: Request,
	_admin: dict[str, Any] = Depends(require_admin),
):
	if not ObjectId.is_valid(discount_id):
		raise HTTPException(status_code=404, detail="Discount not found")
	changes = payload.model_dump(exclude_unset=True)
	if not changes:
		raise HTTPException(status_code=422, detail="No changes supplied")
	if "starts_at" in changes and changes["starts_at"] is None:
		raise HTTPException(status_code=422, detail="starts_at cannot be null")
	database = request.app.state.mongo.database
	existing = database.discounts.find_one({"_id": ObjectId(discount_id)})
	if not existing:
		raise HTTPException(status_code=404, detail="Discount not found")
	starts_at = changes.get("starts_at", existing["starts_at"])
	ends_at = changes.get("ends_at", existing.get("ends_at"))
	if ends_at is not None and ends_at <= starts_at:
		raise HTTPException(status_code=422, detail="ends_at must follow starts_at")
	value = changes.get("value", existing["value"])
	discount_type = changes.get("discount_type", existing["discount_type"])
	if discount_type == "percentage" and value > 10_000:
		raise HTTPException(status_code=422, detail="Percentage value cannot exceed 10000")
	if "product_ids" in changes:
		product_ids = [ObjectId(value) for value in changes["product_ids"]]
		if product_ids and database.products.count_documents({"_id": {"$in": product_ids}}) != len(set(product_ids)):
			raise HTTPException(status_code=404, detail="One or more products were not found")
		changes["product_ids"] = product_ids
	for key in ("starts_at", "ends_at"):
		if changes.get(key) is not None:
			changes[key] = changes[key].astimezone(timezone.utc)
	changes["updated_at"] = now_utc()
	result = database.discounts.update_one({"_id": ObjectId(discount_id)}, {"$set": changes})
	if not result.matched_count:
		raise HTTPException(status_code=404, detail="Discount not found")
	return serialize_document(database.discounts.find_one({"_id": ObjectId(discount_id)}))


@router.delete("/{discount_id}", status_code=204)
def disable_discount(
	discount_id: str,
	request: Request,
	_admin: dict[str, Any] = Depends(require_admin),
):
	if not ObjectId.is_valid(discount_id):
		raise HTTPException(status_code=404, detail="Discount not found")
	result = request.app.state.mongo.database.discounts.update_one(
		{"_id": ObjectId(discount_id)},
		{"$set": {"is_active": False, "updated_at": now_utc()}},
	)
	if not result.matched_count:
		raise HTTPException(status_code=404, detail="Discount not found")
