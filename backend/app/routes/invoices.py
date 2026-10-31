from __future__ import annotations

from datetime import timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pymongo import ReturnDocument

from app.core.permissions import get_current_user, require_admin
from app.models.user import UserRole
from app.schemas.invoice import InvoiceConfirmRequest
from app.services.billing_service import generate_due_invoices, generate_invoice_for_subscription
from app.services.business_service import (
	customer_owns,
	get_customer_for_user,
	require_business_permission,
	serialize_document,
)
from app.services.business_service import now_utc

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _invoice_response(invoice: dict[str, Any]) -> dict[str, Any]:
	result = serialize_document(invoice)
	result["outstanding_paise"] = max(0, invoice.get("total_paise", 0) - invoice.get("amount_paid_paise", 0))
	return result


def _customer_filter(database: Any, user: dict[str, Any]) -> dict[str, Any]:
	customer = get_customer_for_user(database, user)
	return {"customer_id": customer["_id"]}


@router.post("/run-billing")
def run_billing(request: Request, _admin: dict[str, Any] = Depends(require_admin)):
	invoices = generate_due_invoices(request.app.state.mongo.database)
	return {"generated": len(invoices), "invoices": [_invoice_response(invoice) for invoice in invoices]}


@router.post("/from-subscription/{subscription_id}", status_code=201)
def generate_from_subscription(
	subscription_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "invoices:write")
	if not ObjectId.is_valid(subscription_id):
		raise HTTPException(status_code=404, detail="Subscription not found")
	database = request.app.state.mongo.database
	subscription = database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
	if not subscription:
		raise HTTPException(status_code=404, detail="Subscription not found")
	invoice = generate_invoice_for_subscription(database, subscription)
	return _invoice_response(invoice)


@router.get("")
def list_invoices(
	request: Request,
	page: int = Query(default=1, ge=1),
	page_size: int = Query(default=50, ge=1, le=100),
	user: dict[str, Any] = Depends(get_current_user),
):
	database = request.app.state.mongo.database
	if user.get("role") == UserRole.CUSTOMER.value:
		query = _customer_filter(database, user)
	else:
		require_business_permission(user, "invoices:read")
		query = {}
	cursor = database.invoices.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
	return {"items": [_invoice_response(item) for item in cursor], "page": page, "page_size": page_size}


@router.get("/{invoice_id}")
def get_invoice(
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
	customer = database.customers.find_one({"_id": invoice["customer_id"]})
	if user.get("role") == UserRole.CUSTOMER.value:
		if not customer or not customer_owns(user, customer):
			raise HTTPException(status_code=404, detail="Invoice not found")
	else:
		require_business_permission(user, "invoices:read")
	return _invoice_response(invoice)


@router.post("/{invoice_id}/confirm")
def confirm_invoice(
	invoice_id: str,
	payload: InvoiceConfirmRequest,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "invoices:write")
	if not ObjectId.is_valid(invoice_id):
		raise HTTPException(status_code=404, detail="Invoice not found")
	changes: dict[str, Any] = {"status": "confirmed", "updated_at": now_utc()}
	if payload.due_at is not None:
		changes["due_at"] = payload.due_at.astimezone(timezone.utc)
	result = request.app.state.mongo.database.invoices.find_one_and_update(
		{"_id": ObjectId(invoice_id), "status": "draft"},
		{"$set": changes},
		return_document=ReturnDocument.AFTER,
	)
	if not result:
		existing = request.app.state.mongo.database.invoices.find_one({"_id": ObjectId(invoice_id)})
		if not existing:
			raise HTTPException(status_code=404, detail="Invoice not found")
		raise HTTPException(status_code=409, detail="Only draft invoices can be confirmed")
	return _invoice_response(result)


@router.post("/{invoice_id}/cancel")
def cancel_invoice(
	invoice_id: str,
	request: Request,
	user: dict[str, Any] = Depends(get_current_user),
):
	require_business_permission(user, "invoices:write")
	if not ObjectId.is_valid(invoice_id):
		raise HTTPException(status_code=404, detail="Invoice not found")
	database = request.app.state.mongo.database
	result = database.invoices.find_one_and_update(
		{"_id": ObjectId(invoice_id), "status": {"$in": ["draft", "confirmed"]}, "amount_paid_paise": 0},
		{"$set": {"status": "cancelled", "updated_at": now_utc()}},
		return_document=ReturnDocument.AFTER,
	)
	if not result:
		existing = database.invoices.find_one({"_id": ObjectId(invoice_id)})
		if not existing:
			raise HTTPException(status_code=404, detail="Invoice not found")
		raise HTTPException(status_code=409, detail="Paid or cancelled invoices cannot be cancelled")
	return _invoice_response(result)
