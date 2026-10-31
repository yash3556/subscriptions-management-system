from __future__ import annotations

from datetime import datetime
from typing import TypedDict


class DiscountDocument(TypedDict, total=False):
	_id: object
	name: str
	discount_type: str
	value: int
	minimum_amount_paise: int
	minimum_quantity: int
	starts_at: datetime
	ends_at: datetime | None
	usage_limit: int | None
	usage_count: int
	product_ids: list[object]
	applies_to_subscription: bool
	is_active: bool
	created_at: datetime
	updated_at: datetime
