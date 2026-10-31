from __future__ import annotations

from datetime import timezone
from typing import Any
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.permissions import get_current_user, require_admin
from app.models.user import UserRole
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.business_service import now_utc, serialize_document

router = APIRouter(prefix="/products", tags=["products"])


def _visible_product(product: dict[str, Any], role: str) -> dict[str, Any]:
	result = serialize_document(product)
	if role != UserRole.ADMIN.value:
		result.pop("cost_price_paise", None)
	return result


@router.get("")
def list_products(
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	if user.get("role") == UserRole.INTERNAL_STAFF.value:
		if "products:read" not in user.get("permissions", []):
			raise HTTPException(status_code=403, detail="Insufficient permissions")
	database = request.app.state.mongo.database
	query = {"is_active": True} if user.get("role") == UserRole.CUSTOMER.value else {}
	cursor = database.products.find(query).sort("name", 1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [_visible_product(item, user["role"]) for item in cursor], "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_product(
	payload: ProductCreate,
	request: Request,
	_admin: dict[str, Any] = Depends(require_admin),
):
	document = payload.model_dump()
	document["variants"] = [
		{"id": uuid4().hex, **variant.model_dump()} for variant in payload.variants
	]
	document.update({"created_at": now_utc(), "updated_at": now_utc()})
	result = request.app.state.mongo.database.products.insert_one(document)
	document["_id"] = result.inserted_id
	return serialize_document(document)


@router.get("/{product_id}")
def get_product(
	product_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	if not ObjectId.is_valid(product_id):
		raise HTTPException(status_code=404, detail="Product not found")
	product = request.app.state.mongo.database.products.find_one({"_id": ObjectId(product_id)})
	if not product or (user.get("role") == UserRole.CUSTOMER.value and not product.get("is_active")):
		raise HTTPException(status_code=404, detail="Product not found")
	if user.get("role") == UserRole.INTERNAL_STAFF.value and "products:read" not in user.get("permissions", []):
		raise HTTPException(status_code=403, detail="Insufficient permissions")
	return _visible_product(product, user["role"])


@router.patch("/{product_id}")
def update_product(
	product_id: str,
	payload: ProductUpdate,
	request: Request,
	_admin: dict[str, Any] = Depends(require_admin),
):
	if not ObjectId.is_valid(product_id):
		raise HTTPException(status_code=404, detail="Product not found")
	changes = payload.model_dump(exclude_unset=True)
	if "variants" in changes:
		old = request.app.state.mongo.database.products.find_one({"_id": ObjectId(product_id)}) or {}
		old_ids = {variant["name"].casefold(): variant["id"] for variant in old.get("variants", [])}
		changes["variants"] = [
			{"id": old_ids.get(item["name"].casefold(), uuid4().hex), **item}
			for item in changes["variants"]
		]
	changes["updated_at"] = now_utc()
	result = request.app.state.mongo.database.products.update_one({"_id": ObjectId(product_id)}, {"$set": changes})
	if not result.matched_count:
		raise HTTPException(status_code=404, detail="Product not found")
	return serialize_document(request.app.state.mongo.database.products.find_one({"_id": ObjectId(product_id)}))


@router.delete("/{product_id}", status_code=204)
def deactivate_product(
	product_id: str,
	request: Request,
	_admin: dict[str, Any] = Depends(require_admin),
):
	if not ObjectId.is_valid(product_id):
		raise HTTPException(status_code=404, detail="Product not found")
	result = request.app.state.mongo.database.products.update_one(
		{"_id": ObjectId(product_id)}, {"$set": {"is_active": False, "updated_at": now_utc()}}
	)
	if not result.matched_count:
		raise HTTPException(status_code=404, detail="Product not found")
