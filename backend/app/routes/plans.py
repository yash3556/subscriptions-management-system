from __future__ import annotations

from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.permissions import get_current_user, require_admin
from app.models.user import UserRole
from app.schemas.plan import PlanCreate, PlanUpdate
from app.services.business_service import now_utc, serialize_document

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("")
def list_plans(
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	if user.get("role") == UserRole.INTERNAL_STAFF.value and "plans:read" not in user.get("permissions", []):
		raise HTTPException(status_code=403, detail="Insufficient permissions")
	database = request.app.state.mongo.database
	query = {"is_active": True} if user.get("role") == UserRole.CUSTOMER.value else {}
	cursor = database.plans.find(query).sort("name", 1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [serialize_document(item) for item in cursor], "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_plan(payload: PlanCreate, request: Request, _admin: dict[str, Any] = Depends(require_admin)):
	document = payload.model_dump()
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
	if user.get("role") == UserRole.INTERNAL_STAFF.value and "plans:read" not in user.get("permissions", []):
		raise HTTPException(status_code=403, detail="Insufficient permissions")
	return serialize_document(plan)


@router.patch("/{plan_id}")
def update_plan(plan_id: str, payload: PlanUpdate, request: Request, _admin: dict[str, Any] = Depends(require_admin)):
	if not ObjectId.is_valid(plan_id):
		raise HTTPException(status_code=404, detail="Plan not found")
	changes = payload.model_dump(exclude_unset=True)
	if not changes:
		raise HTTPException(status_code=422, detail="No changes supplied")
	changes["updated_at"] = now_utc()
	database = request.app.state.mongo.database
	result = database.plans.update_one({"_id": ObjectId(plan_id)}, {"$set": changes})
	if not result.matched_count:
		raise HTTPException(status_code=404, detail="Plan not found")
	return serialize_document(database.plans.find_one({"_id": ObjectId(plan_id)}))


@router.delete("/{plan_id}", status_code=204)
def deactivate_plan(plan_id: str, request: Request, _admin: dict[str, Any] = Depends(require_admin)):
	if not ObjectId.is_valid(plan_id):
		raise HTTPException(status_code=404, detail="Plan not found")
	result = request.app.state.mongo.database.plans.update_one(
		{"_id": ObjectId(plan_id)}, {"$set": {"is_active": False, "updated_at": now_utc()}}
	)
	if not result.matched_count:
		raise HTTPException(status_code=404, detail="Plan not found")
