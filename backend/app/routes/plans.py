from __future__ import annotations

import re
from datetime import timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.permissions import get_current_user
from app.models.user import UserRole
from app.schemas.plan import PlanCreate, PlanUpdate
from app.services.business_service import now_utc, require_business_permission, serialize_document

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("")
def list_plans(
	request: Request,
	q: str | None = Query(default=None, max_length=120),
	frequency: str | None = Query(default=None, pattern="^(daily|weekly|monthly|yearly)$"),
	is_active: bool | None = None,
	available: bool | None = None,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	if user.get("role") != UserRole.CUSTOMER.value:
		require_business_permission(user, "plans:read")
	database = request.app.state.mongo.database
	now = now_utc()
	query: dict[str, Any] = {"is_active": True} if user.get("role") == UserRole.CUSTOMER.value else {}
	clauses: list[dict[str, Any]] = []
	if is_active is not None and user.get("role") != UserRole.CUSTOMER.value:
		query["is_active"] = is_active
	if frequency:
		query["frequency"] = frequency
	if q and q.strip():
		pattern = re.escape(q.strip())
		clauses.append({"$or": [
			{"name": {"$regex": pattern, "$options": "i"}},
			{"description": {"$regex": pattern, "$options": "i"}},
		]})
	if available is True:
		query["is_active"] = True
		clauses.extend([
			{"$or": [{"available_from": None}, {"available_from": {"$lte": now}}]},
			{"$or": [{"available_until": None}, {"available_until": {"$gte": now}}]},
		])
	elif available is False:
		clauses.append({"$or": [
			{"available_from": {"$gt": now}},
			{"available_until": {"$lt": now}},
		]})
	if clauses:
		query["$and"] = clauses
	cursor = database.plans.find(query).sort("name", 1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [serialize_document(item) for item in cursor], "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_plan(payload: PlanCreate, request: Request, user: dict[str, Any] = Depends(get_current_user)):
	require_business_permission(user, "plans:write")
	document = payload.model_dump()
	if document["available_from"] is not None:
		document["available_from"] = document["available_from"].astimezone(timezone.utc)
	if document["available_until"] is not None:
		document["available_until"] = document["available_until"].astimezone(timezone.utc)
	document.update({"created_at": now_utc(), "updated_at": now_utc()})
	result = request.app.state.mongo.database.plans.insert_one(document)
	document["_id"] = result.inserted_id
	return serialize_document(document)


@router.get("/{plan_id}")
def get_plan(plan_id: str, request: Request, user: dict[str, Any] = Depends(get_current_user)):
	if not ObjectId.is_valid(plan_id):
		raise HTTPException(status_code=404, detail="Plan not found")
	plan = request.app.state.mongo.database.plans.find_one({"_id": ObjectId(plan_id)})
	if not plan or (user.get("role") == UserRole.CUSTOMER.value and not plan.get("is_active")):
		raise HTTPException(status_code=404, detail="Plan not found")
	if user.get("role") != UserRole.CUSTOMER.value:
		require_business_permission(user, "plans:read")
	return serialize_document(plan)


@router.patch("/{plan_id}")
def update_plan(plan_id: str, payload: PlanUpdate, request: Request, user: dict[str, Any] = Depends(get_current_user)):
	require_business_permission(user, "plans:write")
	if not ObjectId.is_valid(plan_id):
		raise HTTPException(status_code=404, detail="Plan not found")
	changes = payload.model_dump(exclude_unset=True)
	if not changes:
		raise HTTPException(status_code=422, detail="No changes supplied")
	database = request.app.state.mongo.database
	existing = database.plans.find_one({"_id": ObjectId(plan_id)})
	if not existing:
		raise HTTPException(status_code=404, detail="Plan not found")
	available_from = changes.get("available_from", existing.get("available_from"))
	available_until = changes.get("available_until", existing.get("available_until"))
	if available_from and available_until and available_until < available_from:
		raise HTTPException(status_code=422, detail="available_until must not precede available_from")
	for key in ("available_from", "available_until"):
		if changes.get(key) is not None:
			changes[key] = changes[key].astimezone(timezone.utc)
	changes["updated_at"] = now_utc()
	result = database.plans.update_one({"_id": ObjectId(plan_id)}, {"$set": changes})
	if not result.matched_count:
		raise HTTPException(status_code=404, detail="Plan not found")
	return serialize_document(database.plans.find_one({"_id": ObjectId(plan_id)}))


@router.delete("/{plan_id}", status_code=204)
def deactivate_plan(plan_id: str, request: Request, user: dict[str, Any] = Depends(get_current_user)):
	require_business_permission(user, "plans:write")
	if not ObjectId.is_valid(plan_id):
		raise HTTPException(status_code=404, detail="Plan not found")
	result = request.app.state.mongo.database.plans.update_one(
		{"_id": ObjectId(plan_id)}, {"$set": {"is_active": False, "updated_at": now_utc()}}
	)
	if not result.matched_count:
		raise HTTPException(status_code=404, detail="Plan not found")
