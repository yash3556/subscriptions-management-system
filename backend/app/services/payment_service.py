from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from app.services.business_service import now_utc


def record_payment(
	database: Any,
	*,
	invoice: dict[str, Any],
	amount_paise: int,
	method: str,
	idempotency_key: str,
	recorded_by: ObjectId,
	reference: str | None = None,
	note: str | None = None,
) -> tuple[dict[str, Any], bool]:
	if invoice.get("status") != "confirmed":
		raise HTTPException(status_code=409, detail="Only confirmed invoices can receive payments")
	payment = {
		"invoice_id": invoice["_id"],
		"customer_id": invoice["customer_id"],
		"idempotency_key": idempotency_key,
		"amount_paise": amount_paise,
		"currency": "INR",
		"method": method,
		"status": "pending",
		"reference": reference,
		"note": note,
		"recorded_by": recorded_by,
		"recorded_at": now_utc(),
	}
	created = True
	try:
		inserted = database.payments.insert_one(payment)
		payment["_id"] = inserted.inserted_id
	except DuplicateKeyError:
		created = False
		payment = database.payments.find_one(
			{"invoice_id": invoice["_id"], "idempotency_key": idempotency_key}
		)
		if not payment:
			raise HTTPException(status_code=409, detail="Duplicate payment request") from None
		if (
			payment["amount_paise"] != amount_paise
			or payment["method"] != method
			or payment.get("reference") != reference
		):
			raise HTTPException(status_code=409, detail="Idempotency key was already used with different payment data")
		if payment.get("status") == "recorded":
			return payment, False

	payment_id = payment["_id"]
	current_invoice = database.invoices.find_one({"_id": invoice["_id"]})
	if current_invoice is None:
		database.payments.delete_one({"_id": payment_id, "status": "pending"})
		raise HTTPException(status_code=404, detail="Invoice not found")

	if payment_id not in current_invoice.get("payment_ids", []):
		update = database.invoices.update_one(
			{
				"_id": invoice["_id"],
				"status": "confirmed",
				"payment_ids": {"$ne": payment_id},
				"$expr": {
					"$lte": [
						{"$add": [{"$ifNull": ["$amount_paid_paise", 0]}, amount_paise]},
						"$total_paise",
					]
				},
			},
			{
				"$inc": {"amount_paid_paise": amount_paise},
				"$addToSet": {"payment_ids": payment_id},
				"$set": {"updated_at": now_utc()},
			},
		)
		if not update.matched_count:
			current_invoice = database.invoices.find_one({"_id": invoice["_id"]})
			if not current_invoice or payment_id not in current_invoice.get("payment_ids", []):
				database.payments.delete_one({"_id": payment_id, "status": "pending"})
				if current_invoice is None:
					raise HTTPException(status_code=404, detail="Invoice not found")
				if current_invoice.get("status") != "confirmed":
					raise HTTPException(status_code=409, detail="Invoice is not open for payment")
				raise HTTPException(status_code=409, detail="Payment exceeds the invoice outstanding balance")

	current_invoice = database.invoices.find_one({"_id": invoice["_id"]})
	if current_invoice["amount_paid_paise"] >= current_invoice["total_paise"]:
		database.invoices.update_one(
			{"_id": invoice["_id"], "status": "confirmed"},
			{"$set": {"status": "paid", "updated_at": now_utc()}},
		)
	database.payments.update_one(
		{"_id": payment_id, "status": "pending"},
		{"$set": {"status": "recorded", "recorded_at": now_utc()}},
	)
	return database.payments.find_one({"_id": payment_id}), created


def reconcile_pending_payments(database: Any, *, limit: int = 100) -> int:
	resolved = 0
	for payment in database.payments.find({"status": "pending"}).limit(limit):
		invoice = database.invoices.find_one({"_id": payment["invoice_id"]})
		if invoice and payment["_id"] in invoice.get("payment_ids", []):
			database.payments.update_one(
				{"_id": payment["_id"], "status": "pending"},
				{"$set": {"status": "recorded", "recorded_at": now_utc()}},
			)
			resolved += 1
	return resolved
