from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator

from app.schemas.common import ObjectIdString, Paise, PositiveQuantity


class DiscountCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    discount_type: Literal["fixed", "percentage"]
    value: StrictInt = Field(ge=0)
    minimum_amount_paise: Paise = 0
    minimum_quantity: PositiveQuantity = 1
    starts_at: datetime
    ends_at: datetime | None = None
    usage_limit: StrictInt | None = Field(default=None, gt=0)
    product_ids: list[ObjectIdString] = Field(default_factory=list)
    applies_to_subscription: bool = True

    @model_validator(mode="after")
    def validate_rule(self):
        if self.starts_at.tzinfo is None or (self.ends_at and self.ends_at.tzinfo is None):
            raise ValueError("Discount dates must be timezone-aware")
        if self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must follow starts_at")
        if self.discount_type == "percentage" and self.value > 10_000:
            raise ValueError("Percentage value is basis points and cannot exceed 10000")
        return self


class DiscountUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool | None = None
    ends_at: datetime | None = None
