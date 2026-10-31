from __future__ import annotations

from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status

from app.core.permissions import get_current_user
from app.models.user import UserRole
from app.schemas.payment import PaymentCreate
from app.services.business_service import get_customer_for_user, require_business_permission, serialize_document
from app.services.payment_service import record_payment

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("")
def list_payments(
	request: Request,
	invoice_id: str | None = None,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	database = request.app.state.mongo.database
	query: dict[str, Any] = {}
	if user.get("role") == UserRole.CUSTOMER.value:
		customer = get_customer_for_user(database, user)
		query["customer_id"] = customer["_id"]
	else:
		require_business_permission(user, "payments:read")
	if invoice_id:
		if not ObjectId.is_valid(invoice_id):
			raise HTTPException(status_code=404, detail="Invoice not found")
		query["invoice_id"] = ObjectId(invoice_id)
	cursor = database.payments.find(query).sort("recorded_at", -1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [serialize_document(item) for item in cursor], "page": page, "page_size": page_size}


@router.get("/invoices/{invoice_id}")
def list_invoice_payments(
	invoice_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	if not ObjectId.is_valid(invoice_id):
		raise HTTPException(status_code=404, detail="Invoice not found")
	database = request.app.state.mongo.database
	invoice = database.invoices.find_one({"_id": ObjectId(invoice_id)})
	if not invoice:
		raise HTTPException(status_code=404, detail="Invoice not found")
	if user.get("role") == UserRole.CUSTOMER.value:
		customer = get_customer_for_user(database, user)
		if invoice["customer_id"] != customer["_id"]:
			raise HTTPException(status_code=404, detail="Invoice not found")
	else:
		require_business_permission(user, "payments:read")
	return [
		serialize_document(payment)
		for payment in database.payments.find({"invoice_id": invoice["_id"], "status": "recorded"}).sort("recorded_at", 1)
	]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_payment(
	payload: PaymentCreate,
	request: Request,
	response: Response,
	idempotency_key: str = Header(min_length=8, max_length=128, alias="Idempotency-Key"),
	user: dict[str, Any] = Depends(get_current_user),
):
	database = request.app.state.mongo.database
	invoice_id = ObjectId(payload.invoice_id)
	invoice = database.invoices.find_one({"_id": invoice_id})
	if not invoice:
		raise HTTPException(status_code=404, detail="Invoice not found")
	if user.get("role") == UserRole.CUSTOMER.value:
		customer = get_customer_for_user(database, user)
		if invoice["customer_id"] != customer["_id"]:
			raise HTTPException(status_code=404, detail="Invoice not found")
	else:
		require_business_permission(user, "payments:write")
	payment, created = record_payment(
		database,
		invoice=invoice,
		amount_paise=payload.amount_paise,
		method=payload.method,
		idempotency_key=idempotency_key,
		recorded_by=user["_id"],
		reference=payload.reference,
		note=payload.note,
	)
	response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
	return serialize_document(payment)
