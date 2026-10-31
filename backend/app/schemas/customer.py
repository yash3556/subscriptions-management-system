from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.common import ObjectIdString


class CustomerCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	name: str = Field(min_length=1, max_length=120)
	email: EmailStr
	phone: str | None = Field(default=None, max_length=40)
	billing_address: dict[str, str] = Field(default_factory=dict)
	user_id: ObjectIdString | None = None

	@field_validator("name")
	@classmethod
	def normalize_name(cls, value: str) -> str:
		value = value.strip()
		if not value:
			raise ValueError("Name must not be blank")
		return value

	@field_validator("email")
	@classmethod
	def normalize_email(cls, value: EmailStr) -> str:
		return str(value).strip().casefold()


class CustomerUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	name: str | None = Field(default=None, min_length=1, max_length=120)
	phone: str | None = Field(default=None, max_length=40)
	billing_address: dict[str, str] | None = None

	@field_validator("name")
	@classmethod
	def normalize_name(cls, value: str | None) -> str | None:
		if value is None:
			return None
		value = value.strip()
		if not value:
			raise ValueError("Name must not be blank")
		return value
