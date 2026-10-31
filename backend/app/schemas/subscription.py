from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import ObjectIdString


class QuotationLineRequest(BaseModel):
	model_config = ConfigDict(extra="forbid")

	product_id: ObjectIdString | None = None
	variant_id: str | None = Field(default=None, min_length=1, max_length=80)
	plan_id: ObjectIdString | None = None
	quantity: int = Field(ge=1, le=1_000_000)

	@model_validator(mode="after")
	def require_single_item_source(self):
		if bool(self.product_id) == bool(self.plan_id):
			raise ValueError("Exactly one of product_id or plan_id is required")
		if self.variant_id and not self.product_id:
			raise ValueError("variant_id can only be used with product_id")
		return self


class QuotationCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	customer_id: ObjectIdString | None = None
	lines: list[QuotationLineRequest] = Field(min_length=1, max_length=100)
	validity_days: int = Field(default=14, ge=1, le=90)
	notes: str | None = Field(default=None, max_length=2000)


class QuotationUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	lines: list[QuotationLineRequest] | None = Field(default=None, min_length=1, max_length=100)
	validity_days: int | None = Field(default=None, ge=1, le=90)
	notes: str | None = Field(default=None, max_length=2000)


class SubscriptionActivate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	start_at: datetime
	expires_at: datetime | None = None

	@model_validator(mode="after")
	def validate_dates(self):
		if self.start_at.tzinfo is None:
			raise ValueError("start_at must be timezone-aware")
		if self.expires_at:
			if self.expires_at.tzinfo is None:
				raise ValueError("expires_at must be timezone-aware")
			if self.expires_at <= self.start_at:
				raise ValueError("expires_at must follow start_at")
		return self


class SubscriptionRenew(BaseModel):
	model_config = ConfigDict(extra="forbid")

	start_at: datetime
	expires_at: datetime | None = None

	@model_validator(mode="after")
	def validate_dates(self):
		if self.start_at.tzinfo is None or self.start_at.utcoffset() is None:
			raise ValueError("start_at must be timezone-aware")
		if self.expires_at is not None:
			if self.expires_at.tzinfo is None or self.expires_at.utcoffset() is None:
				raise ValueError("expires_at must be timezone-aware")
			if self.expires_at <= self.start_at:
				raise ValueError("expires_at must follow start_at")
		return self
