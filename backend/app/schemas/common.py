from __future__ import annotations

from typing import Annotated

from pydantic import Field, StrictInt

Paise = Annotated[StrictInt, Field(ge=0)]
PositiveQuantity = Annotated[StrictInt, Field(ge=1, le=1_000_000)]
TaxRateBps = Annotated[StrictInt, Field(ge=0, le=10_000)]
ObjectIdString = Annotated[str, Field(pattern=r"^[0-9a-fA-F]{24}$")]