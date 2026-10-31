from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import Paise


class InvoiceResponse(BaseModel):
	id: str
	number: str
	customer_id: str
	subscription_id: str | None = None
	lines: list[dict]
	currency: Literal["INR"] = "INR"
	subtotal_paise: Paise
	discount_paise: Paise
	tax_paise: Paise
	total_paise: Paise
	amount_paid_paise: Paise
	outstanding_paise: Paise
	status: Literal["draft", "confirmed", "paid", "cancelled"]
	due_at: datetime | None = None
	created_at: datetime


class InvoiceConfirmRequest(BaseModel):
	model_config = ConfigDict(extra="forbid")

	due_at: datetime | None = None

	@field_validator("due_at")
	@classmethod
	def require_timezone(cls, value: datetime | None) -> datetime | None:
		if value is not None and value.tzinfo is None:
			raise ValueError("due_at must be timezone-aware")
		return value


class InvoiceUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	due_at: datetime | None = None
	notes: str | None = Field(default=None, max_length=2000)

	@field_validator("due_at")
	@classmethod
	def require_timezone(cls, value: datetime | None) -> datetime | None:
		if value is not None and value.tzinfo is None:
			raise ValueError("due_at must be timezone-aware")
		return value
