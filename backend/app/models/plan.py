from __future__ import annotations

from datetime import datetime
from typing import TypedDict


class PlanDocument(TypedDict, total=False):
	_id: object
	name: str
	price_paise: int
	currency: str
	frequency: str
	min_quantity: int
	tax_rate_bps: int
	available_from: datetime | None
	available_until: datetime | None
	lifecycle_options: dict[str, bool]
	is_active: bool
	created_at: datetime
	updated_at: datetime
