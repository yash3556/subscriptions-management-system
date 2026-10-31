from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.services.business_service import new_number, now_utc


def confirm_quotation(database: Any, quotation_id: str) -> dict[str, Any]:
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
		{"$set": {
			"status": "confirmed",
			"confirmed_at": now,
			"subscription_id": document["_id"],
			"updated_at": now,
		}},
	)
	return document


def activate_subscription(
	database: Any,
	subscription_id: str,
	*,
	start_at: datetime,
	expires_at: datetime | None,
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
		}},
		return_document=ReturnDocument.AFTER,
	)
	if not result:
		existing = database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
		if not existing:
			raise HTTPException(status_code=404, detail="Subscription not found")
		raise HTTPException(status_code=409, detail="Only confirmed subscriptions can be activated")
	return result


def close_subscription(database: Any, subscription_id: str) -> dict[str, Any]:
	if not ObjectId.is_valid(subscription_id):
		raise HTTPException(status_code=404, detail="Subscription not found")
	result = database.subscriptions.find_one_and_update(
		{"_id": ObjectId(subscription_id), "status": {"$in": ["confirmed", "active"]}},
		{"$set": {"status": "closed", "next_billing_at": None, "updated_at": now_utc()}},
		return_document=ReturnDocument.AFTER,
	)
	if not result:
		if not database.subscriptions.find_one({"_id": ObjectId(subscription_id)}):
			raise HTTPException(status_code=404, detail="Subscription not found")
		raise HTTPException(status_code=409, detail="Subscription cannot be closed from its current status")
	return result
