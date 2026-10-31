from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.utils.calculations import allocate_discount


def _eligible_indexes(discount: dict[str, Any], lines: list[dict[str, Any]]) -> list[int]:
	product_ids = {str(value) for value in discount.get("product_ids", [])}
	indexes: list[int] = []
	for index, line in enumerate(lines):
		product_id = line.get("product_id")
		if product_ids:
			if product_id is not None and str(product_id) in product_ids:
				indexes.append(index)
			elif line.get("item_type") == "plan" and discount.get("applies_to_subscription"):
				indexes.append(index)
		elif line.get("item_type") != "plan" or discount.get("applies_to_subscription"):
			indexes.append(index)
	return indexes


def apply_discount_for_period(
	database: Any,
	*,
	lines: list[dict[str, Any]],
	subscription_id: Any,
	billing_period_start: datetime,
	invoice_id: Any,
	now: datetime,
) -> tuple[list[dict[str, Any]], str | None, int]:
	existing_redemption = database.discount_redemptions.find_one(
		{"subscription_id": subscription_id, "billing_period_start": billing_period_start}
	)
	discounts = database.discounts.find(
		{
			"is_active": True,
			"starts_at": {"$lte": now},
			"$or": [{"ends_at": None}, {"ends_at": {"$gt": now}}],
		}
	).sort("starts_at", 1)
	chosen = None
	eligible_indexes: list[int] = []
	allocations: list[int] = []
	redemption_inserted = False

	for discount in discounts:
		if existing_redemption and discount["_id"] != existing_redemption["discount_id"]:
			continue
		indexes = _eligible_indexes(discount, lines)
		eligible = [lines[index] for index in indexes]
		eligible_subtotal = sum(
			line["quantity"] * line["unit_price_paise"] for line in eligible
		)
		eligible_quantity = sum(line["quantity"] for line in eligible)
		if eligible_subtotal < discount.get("minimum_amount_paise", 0):
			continue
		if eligible_quantity < discount.get("minimum_quantity", 1):
			continue

		if not existing_redemption:
			redemption = {
				"discount_id": discount["_id"],
				"invoice_id": invoice_id,
				"subscription_id": subscription_id,
				"billing_period_start": billing_period_start,
				"created_at": now,
			}
			try:
				database.discount_redemptions.insert_one(redemption)
				redemption_inserted = True
			except DuplicateKeyError:
				existing_redemption = database.discount_redemptions.find_one(
					{"subscription_id": subscription_id, "billing_period_start": billing_period_start}
				)
				if not existing_redemption or existing_redemption["discount_id"] != discount["_id"]:
					continue

			if redemption_inserted:
				limit = discount.get("usage_limit")
				query: dict[str, Any] = {"_id": discount["_id"], "is_active": True}
				if limit is not None:
					query["usage_count"] = {"$lt": limit}
				claim = database.discounts.update_one(query, {"$inc": {"usage_count": 1}})
				if not claim.matched_count:
					database.discount_redemptions.delete_one({
						"discount_id": discount["_id"],
						"subscription_id": subscription_id,
						"billing_period_start": billing_period_start,
					})
					continue

		chosen = discount
		eligible_indexes = indexes
		allocations = allocate_discount(
			eligible,
			discount_type=discount["discount_type"],
			discount_value=discount["value"],
		)
		break

	output = [dict(line, discount_paise=0) for line in lines]
	if chosen is None:
		return output, None, 0
	total_discount = 0
	for index, amount in zip(eligible_indexes, allocations, strict=True):
		output[index]["discount_paise"] = amount
		total_discount += amount
	return output, str(chosen["_id"]), total_discount


def rollback_discount_claim(database: Any, discount_id: str | None, *, subscription_id: Any, billing_period_start: datetime) -> None:
	if not discount_id:
		return
		database.discount_redemptions.delete_one(
		{"discount_id": ObjectId(discount_id), "subscription_id": subscription_id, "billing_period_start": billing_period_start}
	)
	database.discounts.update_one(
		{"_id": ObjectId(discount_id), "usage_count": {"$gt": 0}},
		{"$inc": {"usage_count": -1}},
	)
