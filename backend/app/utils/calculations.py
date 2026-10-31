from __future__ import annotations

import calendar
from datetime import datetime, timedelta, timezone
from typing import Any


def add_calendar_months(anchor: datetime, months: int) -> datetime:
	if anchor.tzinfo is None or anchor.utcoffset() is None:
		raise ValueError("Billing dates must be timezone-aware")
	if months < 0:
		raise ValueError("Month offset cannot be negative")
	month_index = anchor.year * 12 + anchor.month - 1 + months
	year, month_zero_based = divmod(month_index, 12)
	month = month_zero_based + 1
	day = min(anchor.day, calendar.monthrange(year, month)[1])
	return anchor.replace(year=year, month=month, day=day)


def billing_date(start_at: datetime, billing_index: int, frequency: str) -> datetime:
	if start_at.tzinfo is None or start_at.utcoffset() is None:
		raise ValueError("Billing dates must be timezone-aware")
	if billing_index < 0:
		raise ValueError("Billing index cannot be negative")
	if frequency == "daily":
		return start_at + timedelta(days=billing_index)
	if frequency == "weekly":
		return start_at + timedelta(weeks=billing_index)
	if frequency == "monthly":
		return add_calendar_months(start_at, billing_index)
	if frequency == "yearly":
		return add_calendar_months(start_at, billing_index * 12)
	raise ValueError("Unsupported billing frequency")


def calculate_line_totals(
	*,
	quantity: int,
	unit_price_paise: int,
	tax_rate_bps: int,
	discount_paise: int = 0,
) -> dict[str, int]:
	if quantity <= 0:
		raise ValueError("Quantity must be positive")
	if unit_price_paise < 0 or discount_paise < 0:
		raise ValueError("Monetary values cannot be negative")
	if not 0 <= tax_rate_bps <= 10_000:
		raise ValueError("Tax rate must be between 0 and 10000 basis points")

	subtotal_paise = quantity * unit_price_paise
	if discount_paise > subtotal_paise:
		raise ValueError("Line discount cannot exceed the line subtotal")
	taxable_paise = subtotal_paise - discount_paise
	tax_paise = (taxable_paise * tax_rate_bps + 5_000) // 10_000
	return {
		"subtotal_paise": subtotal_paise,
		"discount_paise": discount_paise,
		"taxable_paise": taxable_paise,
		"tax_paise": tax_paise,
		"total_paise": taxable_paise + tax_paise,
	}


def calculate_invoice_totals(lines: list[dict[str, Any]]) -> dict[str, int]:
	totals = {
		"subtotal_paise": 0,
		"discount_paise": 0,
		"tax_paise": 0,
		"total_paise": 0,
	}
	for line in lines:
		line_totals = calculate_line_totals(
			quantity=line["quantity"],
			unit_price_paise=line["unit_price_paise"],
			tax_rate_bps=line["tax_rate_bps"],
			discount_paise=line.get("discount_paise", 0),
		)
		for key in totals:
			totals[key] += line_totals[key]
	return totals


def allocate_discount(
	lines: list[dict[str, Any]],
	*,
	discount_type: str,
	discount_value: int,
) -> list[int]:
	bases = [line["quantity"] * line["unit_price_paise"] for line in lines]
	eligible_total = sum(bases)
	if discount_type == "fixed":
		total_discount = min(discount_value, eligible_total)
	elif discount_type == "percentage":
		if not 0 <= discount_value <= 10_000:
			raise ValueError("Percentage discount must be between 0 and 10000 basis points")
		total_discount = (eligible_total * discount_value + 5_000) // 10_000
	else:
		raise ValueError("Unsupported discount type")

	if not eligible_total or not total_discount:
		return [0 for _ in lines]

	allocations = [(total_discount * base) // eligible_total for base in bases]
	remainder = total_discount - sum(allocations)
	for index, base in enumerate(bases):
		if remainder == 0:
			break
		if base > allocations[index]:
			allocations[index] += 1
			remainder -= 1
	return allocations


def utc_now() -> datetime:
	return datetime.now(timezone.utc)
