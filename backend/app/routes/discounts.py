from __future__ import annotations

from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.permissions import get_current_user, require_admin
from app.models.user import UserRole
from app.schemas.discount import DiscountCreate, DiscountUpdate
from app.services.business_service import now_utc, serialize_document

router = APIRouter(prefix="/discounts", tags=["discounts"])


@router.get("")
def list_discounts(
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	if user.get("role") == UserRole.INTERNAL_STAFF.value and "discounts:read" not in user.get("permissions", []):
		raise HTTPException(status_code=403, detail="Insufficient permissions")
	cursor = request.app.state.mongo.database.discounts.find({}).sort("starts_at", -1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [serialize_document(item) for item in cursor], "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_discount(
	payload: DiscountCreate,
	request: Request,
	_admin: dict[str, Any] = Depends(require_admin),
):
	document = payload.model_dump()
	document["product_ids"] = [ObjectId(value) for value in payload.product_ids]
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
	if changes.get("ends_at") is not None and changes["ends_at"].tzinfo is None:
		raise HTTPException(status_code=422, detail="ends_at must be timezone-aware")
	changes["updated_at"] = now_utc()
	database = request.app.state.mongo.database
	result = database.discounts.update_one({"_id": ObjectId(discount_id)}, {"$set": changes})
	if not result.matched_count:
		raise HTTPException(status_code=404, detail="Discount not found")
	return serialize_document(database.discounts.find_one({"_id": ObjectId(discount_id)}))
