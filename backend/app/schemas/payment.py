from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt

from app.schemas.common import ObjectIdString


class PaymentCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	invoice_id: ObjectIdString
	amount_paise: StrictInt = Field(gt=0)
	method: Literal["cash", "bank_transfer", "upi", "card", "other"]
	reference: str | None = Field(default=None, max_length=160)
	note: str | None = Field(default=None, max_length=1000)
