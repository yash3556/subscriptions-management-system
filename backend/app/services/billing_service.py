from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from bson import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.services.business_service import new_number, now_utc
from app.services.discount_service import apply_discount_for_period, rollback_discount_claim
from app.utils.calculations import billing_date, calculate_invoice_totals

PAYMENT_TERMS_DAYS = 15


def generate_invoice_for_subscription(database: Any, subscription: dict[str, Any]) -> dict[str, Any]:
	if subscription.get("status") != "active" or not subscription.get("next_billing_at"):
		raise HTTPException(status_code=409, detail="Subscription is not due for billing")
	now = now_utc()
	period_start = subscription["next_billing_at"]
	if period_start > now:
		raise HTTPException(status_code=409, detail="Subscription is not due for billing")
	existing = database.invoices.find_one(
		{"subscription_id": subscription["_id"], "billing_period_start": period_start}
	)
	if existing:
		_advance_subscription(database, subscription, period_start)
		return existing

	billing_index = subscription.get("billing_index", 0)
	frequency = next(
		(line["frequency"] for line in subscription["lines"] if line.get("frequency")),
		"monthly",
	)
	period_end = billing_date(subscription["start_at"], billing_index + 1, frequency)
	skeleton = {
		"number": new_number("INV"),
		"customer_id": subscription["customer_id"],
		"subscription_id": subscription["_id"],
		"billing_period_start": period_start,
		"billing_period_end": period_end,
		"lines": subscription["lines"],
		"currency": "INR",
		"subtotal_paise": 0,
		"discount_paise": 0,
		"tax_paise": 0,
		"total_paise": 0,
		"amount_paid_paise": 0,
		"payment_ids": [],
		"status": "draft",
		"due_at": period_start + timedelta(days=PAYMENT_TERMS_DAYS),
		"created_at": now,
		"updated_at": now,
	}
	try:
		inserted = database.invoices.insert_one(skeleton)
		invoice_id = inserted.inserted_id
		skeleton["_id"] = invoice_id
	except DuplicateKeyError:
		existing = database.invoices.find_one(
			{"subscription_id": subscription["_id"], "billing_period_start": period_start}
		)
		if not existing:
			raise HTTPException(status_code=409, detail="Invoice generation is already in progress") from None
		_advance_subscription(database, subscription, period_start)
		return existing

	discounted_lines, discount_id, _ = apply_discount_for_period(
		database,
		lines=subscription["lines"],
		subscription_id=subscription["_id"],
		billing_period_start=period_start,
		invoice_id=invoice_id,
		now=now,
	)
	lines = []
	for source_line in discounted_lines:
		line = dict(source_line)
		computed = calculate_invoice_totals([line])
		line.update({
			"subtotal_paise": line["quantity"] * line["unit_price_paise"],
			"discount_paise": line.get("discount_paise", 0),
			"tax_paise": computed["tax_paise"],
			"total_paise": computed["total_paise"],
		})
		lines.append(line)
	totals = calculate_invoice_totals(lines)
	update = {
		**totals,
		"lines": lines,
		"discount_id": ObjectId(discount_id) if discount_id else None,
		"status": "draft",
		"updated_at": now_utc(),
	}
	try:
		database.invoices.update_one({"_id": invoice_id, "status": "draft"}, {"$set": update})
		_advance_subscription(database, subscription, period_start)
	except Exception:
		rollback_discount_claim(
			database,
			discount_id,
			subscription_id=subscription["_id"],
			billing_period_start=period_start,
		)
		raise
	return database.invoices.find_one({"_id": invoice_id})


def _advance_subscription(database: Any, subscription: dict[str, Any], period_start: datetime) -> None:
	billing_index = subscription.get("billing_index", 0)
	frequency = next(
		(line["frequency"] for line in subscription["lines"] if line.get("frequency")),
		"monthly",
	)
	period_end = billing_date(subscription["start_at"], billing_index + 1, frequency)
	database.subscriptions.update_one(
		{
			"_id": subscription["_id"],
			"status": "active",
			"next_billing_at": period_start,
		},
		{
			"$set": {"next_billing_at": period_end, "updated_at": now_utc()},
			"$inc": {"billing_index": 1},
		},
	)


def generate_due_invoices(database: Any, *, now: datetime | None = None, limit: int = 100) -> list[dict[str, Any]]:
	now = now or now_utc()
	due = database.subscriptions.find(
		{"status": "active", "next_billing_at": {"$lte": now}}
	).sort("next_billing_at", 1).limit(limit)
	generated: list[dict[str, Any]] = []
	for subscription in due:
		try:
			generated.append(generate_invoice_for_subscription(database, subscription))
		except HTTPException as exc:
			if exc.status_code != 409:
				raise
	return generated
