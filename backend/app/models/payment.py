from __future__ import annotations

from datetime import datetime
from typing import TypedDict


class PaymentDocument(TypedDict, total=False):
	_id: object
	invoice_id: object
	customer_id: object
	idempotency_key: str
	amount_paise: int
	currency: str
	method: str
	status: str
	reference: str | None
	note: str | None
	recorded_at: datetime
