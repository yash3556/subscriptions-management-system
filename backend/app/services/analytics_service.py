from __future__ import annotations

from datetime import datetime
from typing import Any

from app.services.business_service import now_utc


def dashboard_summary(database: Any) -> dict[str, Any]:
	payments = list(database.payments.aggregate([
		{"$match": {"status": "recorded"}},
		{"$group": {"_id": None, "total": {"$sum": "$amount_paise"}}},
	]))
	invoices = list(database.invoices.aggregate([
		{"$match": {"status": {"$in": ["draft", "confirmed"]}}},
		{"$group": {
			"_id": None,
			"outstanding": {"$sum": {"$max": [0, {"$subtract": ["$total_paise", "$amount_paid_paise"]}]}},
		}},
	]))
	overdue = list(database.invoices.aggregate([
		{"$match": {"status": "confirmed", "due_at": {"$lt": now_utc()}}},
		{"$match": {"$expr": {"$lt": ["$amount_paid_paise", "$total_paise"]}}},
		{"$count": "count"},
	]))
	return {
		"total_customers": database.customers.count_documents({}),
		"total_products": database.products.count_documents({}),
		"active_subscriptions": database.subscriptions.count_documents({"status": "active"}),
		"total_invoices": database.invoices.count_documents({}),
		"collected_revenue_paise": payments[0]["total"] if payments else 0,
		"outstanding_paise": invoices[0]["outstanding"] if invoices else 0,
		"overdue_invoices": overdue[0]["count"] if overdue else 0,
		"recent_transactions": list(
			database.payments.find({"status": "recorded"})
			.sort("recorded_at", -1)
			.limit(5)
		),
		"recent_subscriptions": list(
			database.subscriptions.find({})
			.sort("created_at", -1)
			.limit(5)
		),
	}


def revenue_report(database: Any, *, from_date: datetime | None, to_date: datetime | None) -> list[dict[str, Any]]:
	match: dict[str, Any] = {"status": "recorded"}
	date_range: dict[str, datetime] = {}
	if from_date is not None:
		date_range["$gte"] = from_date
	if to_date is not None:
		date_range["$lt"] = to_date
	if date_range:
		match["recorded_at"] = date_range
	return list(database.payments.aggregate([
		{"$match": match},
		{"$group": {
			"_id": {"$dateToString": {"format": "%Y-%m", "date": "$recorded_at", "timezone": "UTC"}},
			"collected_paise": {"$sum": "$amount_paise"},
			"payment_count": {"$sum": 1},
		}},
		{"$sort": {"_id": 1}},
		{"$project": {"_id": 0, "month": "$_id", "collected_paise": 1, "payment_count": 1}},
	]))


def overdue_invoices(database: Any, *, page: int, page_size: int) -> list[dict[str, Any]]:
	return list(database.invoices.aggregate([
		{"$match": {"status": "confirmed", "due_at": {"$lt": now_utc()}}},
		{"$match": {"$expr": {"$lt": ["$amount_paid_paise", "$total_paise"]}}},
		{"$sort": {"due_at": 1}},
		{"$skip": (page - 1) * page_size},
		{"$limit": page_size},
	]))
