from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator

from app.schemas.common import Paise, PositiveQuantity, TaxRateBps


class PlanCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	name: str = Field(min_length=1, max_length=160)
	price_paise: Paise
	currency: Literal["INR"] = "INR"
	frequency: Literal["daily", "weekly", "monthly", "yearly"]
	min_quantity: PositiveQuantity = 1
	tax_rate_bps: TaxRateBps = 0
	available_from: datetime | None = None
	available_until: datetime | None = None
	lifecycle_options: dict[str, bool] = Field(default_factory=dict)
	is_active: bool = True

	@model_validator(mode="after")
	def validate_availability(self):
		if self.available_from and self.available_until:
			if self.available_from.tzinfo is None or self.available_until.tzinfo is None:
				raise ValueError("Availability dates must be timezone-aware")
			if self.available_until < self.available_from:
				raise ValueError("available_until must not precede available_from")
		return self


class PlanUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	name: str | None = Field(default=None, min_length=1, max_length=160)
	price_paise: Paise | None = None
	frequency: Literal["daily", "weekly", "monthly", "yearly"] | None = None
	min_quantity: PositiveQuantity | None = None
	tax_rate_bps: TaxRateBps | None = None
	available_from: datetime | None = None
	available_until: datetime | None = None
	lifecycle_options: dict[str, bool] | None = None
	is_active: bool | None = None
