from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator

from app.schemas.common import Paise, TaxRateBps


class ProductVariantIn(BaseModel):
	model_config = ConfigDict(extra="forbid")

	name: str = Field(min_length=1, max_length=80)
	price_adjustment_paise: StrictInt = Field(ge=0)
	is_active: bool = True

	@field_validator("name")
	@classmethod
	def normalize_name(cls, value: str) -> str:
		value = value.strip()
		if not value:
			raise ValueError("Variant name must not be blank")
		return value


class ProductCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	name: str = Field(min_length=1, max_length=160)
	product_type: str = Field(min_length=1, max_length=80)
	sales_price_paise: Paise
	cost_price_paise: Paise
	tax_rate_bps: TaxRateBps = 0
	notes: str | None = Field(default=None, max_length=2000)
	variants: list[ProductVariantIn] = Field(default_factory=list)
	is_active: bool = True

	@field_validator("name", "product_type")
	@classmethod
	def trim_required_text(cls, value: str) -> str:
		value = value.strip()
		if not value:
			raise ValueError("Value must not be blank")
		return value


class ProductUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	name: str | None = Field(default=None, min_length=1, max_length=160)
	product_type: str | None = Field(default=None, min_length=1, max_length=80)
	sales_price_paise: Paise | None = None
	cost_price_paise: Paise | None = None
	tax_rate_bps: TaxRateBps | None = None
	notes: str | None = Field(default=None, max_length=2000)
	variants: list[ProductVariantIn] | None = None
	is_active: bool | None = None
