from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.services.business_service import new_number, now_utc


def confirm_quotation(
	database: Any,
	quotation_id: str,
	*,
	actor_id: ObjectId | None = None,
) -> dict[str, Any]:
	if not ObjectId.is_valid(quotation_id):
		raise HTTPException(status_code=404, detail="Quotation not found")
	quote = database.quotations.find_one({"_id": ObjectId(quotation_id)})
	if not quote:
		raise HTTPException(status_code=404, detail="Quotation not found")
	if quote.get("status") == "confirmed" and quote.get("subscription_id"):
		return database.subscriptions.find_one({"_id": quote["subscription_id"]})
	if quote.get("status") != "quotation" or not quote.get("customer_accepted_at"):
		raise HTTPException(status_code=409, detail="Quotation must be accepted before confirmation")
	if quote["valid_until"] <= now_utc():
		raise HTTPException(status_code=409, detail="Quotation has expired")

	plan_ids = {line.get("plan_id") for line in quote["lines"] if line.get("plan_id")}
	plan_id = next(iter(plan_ids)) if len(plan_ids) == 1 else None
	now = now_utc()
	document = {
		"number": new_number("SUB"),
		"customer_id": quote["customer_id"],
		"quotation_id": quote["_id"],
		"plan_id": plan_id,
		"lines": quote["lines"],
		"status": "confirmed",
		"start_at": None,
		"expires_at": None,
		"next_billing_at": None,
		"payment_terms": "due_on_receipt",
		"history": [{"status": "confirmed", "at": now, "actor_id": actor_id}],
		"created_at": now,
		"updated_at": now,
	}
	try:
		inserted = database.subscriptions.insert_one(document)
		document["_id"] = inserted.inserted_id
	except DuplicateKeyError:
		existing = database.subscriptions.find_one({"quotation_id": quote["_id"]})
		if existing:
			document = existing
		else:
			raise HTTPException(status_code=409, detail="Subscription already exists") from None

	database.quotations.update_one(
		{"_id": quote["_id"], "status": "quotation", "customer_accepted_at": {"$ne": None}},
		{
			"$set": {
				"status": "confirmed",
				"confirmed_at": now,
				"subscription_id": document["_id"],
				"updated_at": now,
			},
			"$push": {"history": {"status": "confirmed", "at": now, "actor_id": actor_id}},
		},
	)
	return document


def activate_subscription(
	database: Any,
	subscription_id: str,
	*,
	start_at: datetime,
	expires_at: datetime | None,
	actor_id: ObjectId | None = None,
) -> dict[str, Any]:
	if not ObjectId.is_valid(subscription_id):
		raise HTTPException(status_code=404, detail="Subscription not found")
	if start_at.tzinfo is None:
		raise HTTPException(status_code=422, detail="start_at must be timezone-aware")
	start_at = start_at.astimezone(timezone.utc)
	if expires_at:
		expires_at = expires_at.astimezone(timezone.utc)
	result = database.subscriptions.find_one_and_update(
		{"_id": ObjectId(subscription_id), "status": "confirmed"},
		{"$set": {
			"status": "active",
			"start_at": start_at,
			"expires_at": expires_at,
			"next_billing_at": start_at,
			"updated_at": now_utc(),
		}, "$push": {"history": {"status": "active", "at": now_utc(), "actor_id": actor_id}}},
		return_document=ReturnDocument.AFTER,
	)
	if not result:
		existing = database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
		if not existing:
			raise HTTPException(status_code=404, detail="Subscription not found")
		raise HTTPException(status_code=409, detail="Only confirmed subscriptions can be activated")
	return result


def close_subscription(
	database: Any,
	subscription_id: str,
	*,
	actor_id: ObjectId | None = None,
) -> dict[str, Any]:
	if not ObjectId.is_valid(subscription_id):
		raise HTTPException(status_code=404, detail="Subscription not found")
	subscription = database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
	if not subscription:
		raise HTTPException(status_code=404, detail="Subscription not found")
	options = subscription.get("lifecycle_options", {})
	if not options:
		options = next(
			(line.get("lifecycle_options", {}) for line in subscription.get("lines", []) if line.get("lifecycle_options")),
			{},
		)
	if options.get("allowEarlyClosure", options.get("allow_early_closure", True)) is False:
		expires_at = subscription.get("expires_at")
		if expires_at is None or expires_at > now_utc():
			raise HTTPException(status_code=409, detail="Early closure is disabled for this subscription")
	result = database.subscriptions.find_one_and_update(
		{"_id": ObjectId(subscription_id), "status": {"$in": ["confirmed", "active"]}},
		{
			"$set": {"status": "closed", "next_billing_at": None, "updated_at": now_utc()},
			"$push": {"history": {"status": "closed", "at": now_utc(), "actor_id": actor_id}},
		},
		return_document=ReturnDocument.AFTER,
	)
	if not result:
		if not database.subscriptions.find_one({"_id": ObjectId(subscription_id)}):
			raise HTTPException(status_code=404, detail="Subscription not found")
		raise HTTPException(status_code=409, detail="Subscription cannot be closed from its current status")
	return result


def pause_subscription(
	database: Any,
	subscription_id: str,
	*,
	actor_id: ObjectId | None = None,
) -> dict[str, Any]:
	if not ObjectId.is_valid(subscription_id):
		raise HTTPException(status_code=404, detail="Subscription not found")
	subscription = database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
	if not subscription:
		raise HTTPException(status_code=404, detail="Subscription not found")
	options = subscription.get("lifecycle_options", {})
	if not options:
		options = next(
			(line.get("lifecycle_options", {}) for line in subscription.get("lines", []) if line.get("lifecycle_options")),
			{},
		)
	if options.get("allowPause", options.get("allow_pause", True)) is False:
		raise HTTPException(status_code=409, detail="Pausing is disabled for this subscription")
	now = now_utc()
	result = database.subscriptions.find_one_and_update(
		{"_id": subscription["_id"], "status": "active"},
		{
			"$set": {
				"status": "paused",
				"paused_at": now,
				"paused_next_billing_at": subscription.get("next_billing_at"),
				"next_billing_at": None,
				"updated_at": now,
			},
			"$push": {"history": {"status": "paused", "at": now, "actor_id": actor_id}},
		},
		return_document=ReturnDocument.AFTER,
	)
	if not result:
		raise HTTPException(status_code=409, detail="Only active subscriptions can be paused")
	return result


def resume_subscription(
	database: Any,
	subscription_id: str,
	*,
	actor_id: ObjectId | None = None,
) -> dict[str, Any]:
	if not ObjectId.is_valid(subscription_id):
		raise HTTPException(status_code=404, detail="Subscription not found")
	subscription = database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
	if not subscription:
		raise HTTPException(status_code=404, detail="Subscription not found")
	options = subscription.get("lifecycle_options", {})
	if not options:
		options = next(
			(line.get("lifecycle_options", {}) for line in subscription.get("lines", []) if line.get("lifecycle_options")),
			{},
		)
	if options.get("allowPause", options.get("allow_pause", True)) is False:
		raise HTTPException(status_code=409, detail="Pausing is disabled for this subscription")
	now = now_utc()
	if subscription.get("expires_at") and subscription["expires_at"] <= now:
		database.subscriptions.update_one(
			{"_id": subscription["_id"], "status": "paused"},
			{"$set": {"status": "expired", "next_billing_at": None, "updated_at": now}},
		)
		raise HTTPException(status_code=409, detail="Expired subscriptions cannot be resumed")
	next_billing_at = subscription.get("paused_next_billing_at") or now
	next_billing_at = max(next_billing_at, now)
	result = database.subscriptions.find_one_and_update(
		{"_id": subscription["_id"], "status": "paused"},
		{
			"$set": {"status": "active", "next_billing_at": next_billing_at, "updated_at": now},
			"$unset": {"paused_at": "", "paused_next_billing_at": ""},
			"$push": {"history": {"status": "active", "event": "resumed", "at": now, "actor_id": actor_id}},
		},
		return_document=ReturnDocument.AFTER,
	)
	if not result:
		raise HTTPException(status_code=409, detail="Only paused subscriptions can be resumed")
	return result


def renew_subscription(
	database: Any,
	subscription_id: str,
	*,
	start_at: datetime,
	expires_at: datetime | None,
	actor_id: ObjectId | None = None,
) -> dict[str, Any]:
	if not ObjectId.is_valid(subscription_id):
		raise HTTPException(status_code=404, detail="Subscription not found")
	subscription = database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
	if not subscription:
		raise HTTPException(status_code=404, detail="Subscription not found")
	options = subscription.get("lifecycle_options", {})
	if not options:
		options = next(
			(line.get("lifecycle_options", {}) for line in subscription.get("lines", []) if line.get("lifecycle_options")),
			{},
		)
	if options.get("allowRenewal", options.get("allow_renewal", True)) is False:
		raise HTTPException(status_code=409, detail="Renewal is disabled for this subscription")
	if subscription.get("status") not in {"closed", "expired"}:
		raise HTTPException(status_code=409, detail="Only closed or expired subscriptions can be renewed")
	if start_at.tzinfo is None or start_at.utcoffset() is None:
		raise HTTPException(status_code=422, detail="start_at must be timezone-aware")
	start_at = start_at.astimezone(timezone.utc)
	if expires_at is not None:
		if expires_at.tzinfo is None or expires_at.utcoffset() is None:
			raise HTTPException(status_code=422, detail="expires_at must be timezone-aware")
		expires_at = expires_at.astimezone(timezone.utc)
		if expires_at <= start_at:
			raise HTTPException(status_code=422, detail="expires_at must follow start_at")
	now = now_utc()
	result = database.subscriptions.find_one_and_update(
		{"_id": subscription["_id"], "status": {"$in": ["closed", "expired"]}},
		{
			"$set": {
				"status": "active",
				"start_at": start_at,
				"expires_at": expires_at,
				"next_billing_at": start_at,
				"billing_index": 0,
				"updated_at": now,
			},
			"$push": {"history": {"status": "active", "event": "renewed", "at": now, "actor_id": actor_id}},
		},
		return_document=ReturnDocument.AFTER,
	)
	if not result:
		raise HTTPException(status_code=409, detail="Subscription changed before renewal")
	return result
