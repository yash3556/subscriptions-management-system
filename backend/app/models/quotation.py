from __future__ import annotations

from datetime import datetime
from typing import Any, TypedDict


class QuotationDocument(TypedDict, total=False):
	_id: object
	number: str
	customer_id: object
	lines: list[dict[str, Any]]
	validity_days: int
	valid_until: datetime
	status: str
	customer_accepted_at: datetime | None
	confirmed_at: datetime | None
	created_by: object
	created_at: datetime
	updated_at: datetime
