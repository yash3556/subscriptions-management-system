from __future__ import annotations

from datetime import datetime
from typing import Any, TypedDict


class SubscriptionDocument(TypedDict, total=False):
	_id: object
	number: str
	customer_id: object
	quotation_id: object
	plan_id: object | None
	lines: list[dict[str, Any]]
	status: str
	start_at: datetime | None
	expires_at: datetime | None
	next_billing_at: datetime | None
	payment_terms: str
	created_at: datetime
	updated_at: datetime
