from __future__ import annotations

from datetime import datetime
from typing import TypedDict


class ProductVariant(TypedDict):
	id: str
	name: str
	price_adjustment_paise: int


class ProductDocument(TypedDict, total=False):
	_id: object
	name: str
	product_type: str
	sales_price_paise: int
	cost_price_paise: int
	tax_rate_bps: int
	notes: str | None
	variants: list[ProductVariant]
	is_active: bool
	created_at: datetime
	updated_at: datetime
