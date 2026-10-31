from __future__ import annotations

from datetime import datetime
from typing import TypedDict


class CustomerDocument(TypedDict, total=False):
	_id: object
	user_id: object | None
	name: str
	email: str
	phone: str | None
	billing_address: dict[str, str]
	created_at: datetime
	updated_at: datetime
