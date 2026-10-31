from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.permissions import require_permission
from app.services.analytics_service import dashboard_summary, overdue_invoices, revenue_report
from app.services.business_service import serialize_document

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _parse_utc(value: datetime | None) -> datetime | None:
	if value is None:
		return None
	if value.tzinfo is None:
		raise HTTPException(status_code=422, detail="Report dates must be timezone-aware")
	return value.astimezone(timezone.utc)


@router.get("/summary")
def summary(request: Request, _user: dict[str, Any] = Depends(require_permission("reports:read"))):
	return dashboard_summary(request.app.state.mongo.database)


@router.get("/revenue")
def revenue(
	request: Request,
	from_date: datetime | None = None,
	to_date: datetime | None = None,
	_user: dict[str, Any] = Depends(require_permission("reports:read")),
):
	lower = _parse_utc(from_date)
	upper = _parse_utc(to_date)
	if lower and upper and upper <= lower:
		raise HTTPException(status_code=422, detail="to_date must follow from_date")
	rows = revenue_report(request.app.state.mongo.database, from_date=lower, to_date=upper)
	return [{key: value for key, value in row.items()} for row in rows]


@router.get("/overdue")
def overdue(
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	_user: dict[str, Any] = Depends(require_permission("reports:read")),
):
	items = overdue_invoices(request.app.state.mongo.database, page=page, page_size=page_size)
	return {"items": [serialize_document(item) for item in items], "page": page, "page_size": page_size}
