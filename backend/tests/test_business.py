from __future__ import annotations

from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import Request
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app.core.permissions import get_current_user
from app.core.config import Settings
from app.core.security import create_access_token, decode_access_token
from app.models.user import UserRole
from app.services.business_service import now_utc
from app.services.billing_service import generate_invoice_for_subscription

API = "/api/v1"


def principal(database, settings: Settings, role: UserRole, permissions=None, email=None):
    user_id = ObjectId()
    document = {
        "_id": user_id,
        "name": role.value.title(),
        "email": email or f"{user_id}@example.test",
        "role": role.value,
        "permissions": permissions or [],
        "is_active": True,
        "token_version": 0,
        "created_at": now_utc(),
    }
    database.users.insert_one(document)
    token, _, _ = create_access_token(str(user_id), settings, token_version=0)
    assert decode_access_token(token, settings)["sub"] == str(user_id)
    return document, {"Authorization": f"Bearer {token}"}


def customer_record(database, user):
    document = {
        "user_id": user["_id"],
        "name": user["name"],
        "email": user["email"],
        "phone": None,
        "billing_address": {},
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    inserted = database.customers.insert_one(document)
    document["_id"] = inserted.inserted_id
    return document


def test_quotation_invoice_partial_payments_and_customer_ownership(
    client: TestClient,
    database,
    settings: Settings,
):
    customer_a, customer_a_headers = principal(database, settings, UserRole.CUSTOMER)
    customer_b, customer_b_headers = principal(database, settings, UserRole.CUSTOMER)
    customer_a_record = customer_record(database, customer_a)
    customer_record(database, customer_b)
    admin, admin_headers = principal(database, settings, UserRole.ADMIN)
    staff, staff_headers = principal(
        database,
        settings,
        UserRole.INTERNAL_STAFF,
        [
            "quotations:read",
            "quotations:write",
            "subscriptions:read",
            "subscriptions:write",
            "invoices:read",
            "invoices:write",
            "payments:read",
            "payments:write",
        ],
    )

    product = {
        "name": "Managed Service",
        "product_type": "service",
        "sales_price_paise": 100_000,
        "cost_price_paise": 50_000,
        "tax_rate_bps": 1_800,
        "variants": [],
        "is_active": True,
        "created_at": now_utc(),
    }
    product["_id"] = database.products.insert_one(product).inserted_id
    admin_token = admin_headers["Authorization"].split(" ", 1)[1]
    direct_user = get_current_user(
        Request({"type": "http", "app": client.app}),
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=admin_token),
    )
    assert direct_user["id"] == str(admin["_id"])
    now = now_utc()
    discount_response = client.post(
        f"{API}/discounts",
        headers=admin_headers,
        json={
            "name": "One-time offer",
            "discount_type": "fixed",
            "value": 10_000,
            "minimum_amount_paise": 0,
            "minimum_quantity": 1,
            "starts_at": (now - timedelta(days=1)).isoformat(),
            "ends_at": (now + timedelta(days=10)).isoformat(),
            "usage_limit": 1,
            "product_ids": [str(product["_id"])],
            "applies_to_subscription": True,
        },
    )
    assert discount_response.status_code == 201, discount_response.text

    quote_response = client.post(
        f"{API}/quotations",
        headers=customer_a_headers,
        json={"lines": [{"product_id": str(product["_id"]), "quantity": 1}]},
    )
    assert quote_response.status_code == 201
    quote = quote_response.json()
    assert quote["total_paise"] == 118_000
    assert "unit_price_paise" not in quote_response.request.content.decode()
    quote_id = quote["id"]

    assert client.get(f"{API}/quotations/{quote_id}", headers=customer_b_headers).status_code == 404
    assert client.post(f"{API}/quotations/{quote_id}/accept", headers=customer_b_headers).status_code == 404
    assert client.post(f"{API}/quotations/{quote_id}/accept", headers=customer_a_headers).status_code == 200
    assert client.post(f"{API}/quotations/{quote_id}/confirm", headers=customer_a_headers).status_code == 403

    confirmed = client.post(f"{API}/quotations/{quote_id}/confirm", headers=staff_headers)
    assert confirmed.status_code == 200
    subscription_id = confirmed.json()["id"]
    assert confirmed.json()["status"] == "confirmed"
    assert client.post(
        f"{API}/subscriptions/{subscription_id}/activate",
        headers=customer_a_headers,
        json={"start_at": now.isoformat()},
    ).status_code == 403

    start_at = now - timedelta(days=1)
    activated = client.post(
        f"{API}/subscriptions/{subscription_id}/activate",
        headers=staff_headers,
        json={"start_at": start_at.isoformat()},
    )
    assert activated.status_code == 200
    assert activated.json()["status"] == "active"
    assert activated.json()["next_billing_at"] == activated.json()["start_at"]

    stale_subscription = database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
    generated = client.post(
        f"{API}/invoices/from-subscription/{subscription_id}",
        headers=staff_headers,
    )
    assert generated.status_code == 201
    invoice = generated.json()
    assert invoice["subtotal_paise"] == 100_000
    assert invoice["discount_paise"] == 10_000
    assert invoice["tax_paise"] == 16_200
    assert invoice["total_paise"] == 106_200
    assert invoice["status"] == "draft"
    duplicate = generate_invoice_for_subscription(database, stale_subscription)
    assert str(duplicate["_id"]) == invoice["id"]
    assert database.invoices.count_documents({"subscription_id": ObjectId(subscription_id)}) == 1
    assert database.discounts.find_one({"_id": ObjectId(discount_response.json()["id"])})["usage_count"] == 1

    assert client.post(f"{API}/invoices/{invoice['id']}/confirm", headers=staff_headers, json={}).status_code == 200
    assert client.get(f"{API}/invoices/{invoice['id']}", headers=customer_b_headers).status_code == 404

    payment_body = {
        "invoice_id": invoice["id"],
        "amount_paise": 40_000,
        "method": "upi",
        "reference": "bank-ref-1",
    }
    first_payment = client.post(
        f"{API}/payments",
        headers={**customer_a_headers, "Idempotency-Key": "payment-unique-001"},
        json=payment_body,
    )
    assert first_payment.status_code == 201
    repeated_payment = client.post(
        f"{API}/payments",
        headers={**customer_a_headers, "Idempotency-Key": "payment-unique-001"},
        json=payment_body,
    )
    assert repeated_payment.status_code == 200
    updated_invoice = client.get(f"{API}/invoices/{invoice['id']}", headers=customer_a_headers).json()
    assert updated_invoice["amount_paid_paise"] == 40_000
    assert updated_invoice["outstanding_paise"] == 66_200
    assert updated_invoice["status"] == "confirmed"

    assert client.get(f"{API}/payments/invoices/{invoice['id']}", headers=customer_b_headers).status_code == 404
    final_payment = client.post(
        f"{API}/payments",
        headers={**customer_a_headers, "Idempotency-Key": "payment-unique-002"},
        json={**payment_body, "amount_paise": 66_200, "reference": "bank-ref-2"},
    )
    assert final_payment.status_code == 201
    paid_invoice = client.get(f"{API}/invoices/{invoice['id']}", headers=customer_a_headers).json()
    assert paid_invoice["amount_paid_paise"] == paid_invoice["total_paise"]
    assert paid_invoice["outstanding_paise"] == 0
    assert paid_invoice["status"] == "paid"

    overpayment = client.post(
        f"{API}/payments",
        headers={**customer_a_headers, "Idempotency-Key": "payment-unique-003"},
        json={**payment_body, "amount_paise": 1, "reference": "extra"},
    )
    assert overpayment.status_code == 409
    assert client.post(f"{API}/subscriptions", headers=customer_a_headers, json={}).status_code == 405
