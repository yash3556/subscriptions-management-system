from __future__ import annotations

from datetime import datetime
from typing import Any, TypedDict


class InvoiceDocument(TypedDict, total=False):
	_id: object
	number: str
	customer_id: object
	subscription_id: object | None
	billing_period_start: datetime | None
	billing_period_end: datetime | None
	lines: list[dict[str, Any]]
	currency: str
	subtotal_paise: int
	discount_paise: int
	tax_paise: int
	total_paise: int
	amount_paid_paise: int
	status: str
	due_at: datetime | None
	created_at: datetime
	updated_at: datetime
