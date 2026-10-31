from __future__ import annotations

from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.permissions import get_current_user
from app.models.user import UserRole
from app.schemas.subscription import SubscriptionActivate
from app.services.business_service import (
	customer_owns,
	get_customer_for_user,
	require_business_permission,
	serialize_document,
)
from app.services.subscription_service import activate_subscription, close_subscription

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("")
def list_subscriptions(
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
		require_business_permission(user, "subscriptions:read")
		query = {}
	cursor = database.subscriptions.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [serialize_document(item) for item in cursor], "page": page, "page_size": page_size}


@router.get("/{subscription_id}")
def get_subscription(
	subscription_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	if not ObjectId.is_valid(subscription_id):
		raise HTTPException(status_code=404, detail="Subscription not found")
	database = request.app.state.mongo.database
	subscription = database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
	if not subscription:
		raise HTTPException(status_code=404, detail="Subscription not found")
	customer = database.customers.find_one({"_id": subscription["customer_id"]})
	if user.get("role") == UserRole.CUSTOMER.value:
		if not customer or not customer_owns(user, customer):
			raise HTTPException(status_code=404, detail="Subscription not found")
	else:
		require_business_permission(user, "subscriptions:read")
	return serialize_document(subscription)


@router.post("/{subscription_id}/activate")
def activate(
	subscription_id: str,
	payload: SubscriptionActivate,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "subscriptions:write")
	subscription = activate_subscription(
		request.app.state.mongo.database,
		subscription_id,
		start_at=payload.start_at,
		expires_at=payload.expires_at,
	)
	return serialize_document(subscription)


@router.post("/{subscription_id}/close")
def close(
	subscription_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "subscriptions:write")
	return serialize_document(close_subscription(request.app.state.mongo.database, subscription_id))
