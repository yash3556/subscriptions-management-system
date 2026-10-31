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
    edited_quote = client.patch(
        f"{API}/quotations/{quote_id}",
        headers=staff_headers,
        json={"notes": "Approved service scope"},
    )
    assert edited_quote.status_code == 200
    assert edited_quote.json()["notes"] == "Approved service scope"
    assert client.post(f"{API}/quotations/{quote_id}/send", headers=staff_headers).status_code == 200

    assert client.get(f"{API}/quotations/{quote_id}", headers=customer_b_headers).status_code == 404
    assert client.post(f"{API}/quotations/{quote_id}/accept", headers=customer_b_headers).status_code == 404
    assert client.post(f"{API}/quotations/{quote_id}/accept", headers=customer_a_headers).status_code == 200
    assert client.post(f"{API}/quotations/{quote_id}/confirm", headers=customer_a_headers).status_code == 403

    confirmed = client.post(f"{API}/quotations/{quote_id}/confirm", headers=staff_headers)
    assert confirmed.status_code == 200
    subscription_id = confirmed.json()["id"]
    assert confirmed.json()["status"] == "confirmed"
    history = client.get(
        f"{API}/subscriptions/{subscription_id}/history",
        headers=customer_a_headers,
    )
    assert history.status_code == 200
    assert history.json()["items"][0]["status"] == "confirmed"
    assert client.post(
        f"{API}/subscriptions/{subscription_id}/activate",
        headers=customer_a_headers,
        json={"start_at": now.isoformat()},
    ).status_code == 403

    start_at = now - timedelta(days=100)
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
    assert client.get(
        f"{API}/customers/{customer_a_record['_id']}/invoices",
        headers=customer_a_headers,
    ).json()["items"][0]["id"] == invoice["id"]

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
    conflicting_replay = client.post(
        f"{API}/payments",
        headers={**customer_a_headers, "Idempotency-Key": "payment-unique-001"},
        json={**payment_body, "amount_paise": 40_001},
    )
    assert conflicting_replay.status_code == 409
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

    recurring_run = client.post(f"{API}/invoices/run-billing", headers=admin_headers)
    assert recurring_run.status_code == 200
    assert recurring_run.json()["generated"] == 1
    assert database.invoices.count_documents({"subscription_id": ObjectId(subscription_id)}) == 2

    paused = client.post(f"{API}/subscriptions/{subscription_id}/pause", headers=staff_headers)
    assert paused.status_code == 200
    assert paused.json()["status"] == "paused"
    assert paused.json()["next_billing_at"] is None
    assert client.post(f"{API}/invoices/run-billing", headers=admin_headers).json()["generated"] == 0
    resumed = client.post(f"{API}/subscriptions/{subscription_id}/resume", headers=staff_headers)
    assert resumed.status_code == 200
    assert resumed.json()["status"] == "active"
    assert resumed.json()["history"][-1]["event"] == "resumed"

    closed = client.post(
        f"{API}/subscriptions/{subscription_id}/close",
        headers=staff_headers,
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"
    assert closed.json()["next_billing_at"] is None
    after_close = client.post(f"{API}/invoices/run-billing", headers=admin_headers)
    assert after_close.status_code == 200
    assert after_close.json()["generated"] == 0
    assert database.invoices.count_documents({"subscription_id": ObjectId(subscription_id)}) == 2
    renewal_start = (now_utc() + timedelta(days=1)).replace(microsecond=0)
    renewed = client.post(
        f"{API}/subscriptions/{subscription_id}/renew",
        headers=staff_headers,
        json={"start_at": renewal_start.isoformat()},
    )
    assert renewed.status_code == 200
    assert renewed.json()["status"] == "active"
    assert datetime.fromisoformat(
        renewed.json()["next_billing_at"].replace("Z", "+00:00")
    ) == renewal_start

    expired_at = now_utc() - timedelta(days=1)
    expired_subscription = {
        "number": "SUB-EXPIRED-VERIFY",
        "customer_id": customer_a_record["_id"],
        "status": "active",
        "start_at": expired_at - timedelta(days=30),
        "expires_at": expired_at,
        "next_billing_at": expired_at,
        "lines": [],
        "created_at": expired_at - timedelta(days=30),
        "updated_at": expired_at - timedelta(days=30),
    }
    expired_subscription_id = database.subscriptions.insert_one(expired_subscription).inserted_id
    expiry_run = client.post(f"{API}/invoices/run-billing", headers=admin_headers)
    assert expiry_run.status_code == 200
    assert expiry_run.json()["generated"] == 0
    expired = database.subscriptions.find_one({"_id": expired_subscription_id})
    assert expired["status"] == "expired"
    assert expired["next_billing_at"] is None
    assert client.post(
        f"{API}/invoices/from-subscription/{expired_subscription_id}",
        headers=staff_headers,
    ).status_code == 409


def test_catalog_search_customer_crud_and_discount_management(
    client: TestClient,
    database,
    settings: Settings,
):
    admin, admin_headers = principal(database, settings, UserRole.ADMIN)
    staff, staff_headers = principal(
        database,
        settings,
        UserRole.INTERNAL_STAFF,
        ["customers:read", "customers:write", "products:read", "products:write", "plans:read", "plans:write"],
    )
    customer_response = client.post(
        f"{API}/customers",
        headers=admin_headers,
        json={"name": "Searchable Customer", "email": "searchable@example.com"},
    )
    assert customer_response.status_code == 201, customer_response.json()
    customer_id = customer_response.json()["id"]
    search = client.get(
        f"{API}/customers",
        headers=staff_headers,
        params={"q": "searchable@example", "page": 1, "page_size": 10},
    )
    assert search.status_code == 200
    assert [item["id"] for item in search.json()["items"]] == [customer_id]
    assert client.patch(
        f"{API}/customers/{customer_id}",
        headers=admin_headers,
        json={"name": "Updated Customer"},
    ).json()["name"] == "Updated Customer"

    product = client.post(
        f"{API}/products",
        headers=staff_headers,
        json={
            "name": "Searchable Product",
            "product_type": "service",
            "sales_price_paise": 20_000,
            "cost_price_paise": 10_000,
            "variants": [
                {"name": "Active", "price_adjustment_paise": 5_000},
                {"name": "Retired", "price_adjustment_paise": 7_000, "is_active": False},
            ],
        },
    )
    assert product.status_code == 201
    active_variant, retired_variant = product.json()["variants"]
    products = client.get(
        f"{API}/products",
        headers=staff_headers,
        params={"q": "searchable", "product_type": "service"},
    )
    assert products.status_code == 200
    assert products.json()["items"][0]["id"] == product.json()["id"]

    customer_user, customer_headers = principal(database, settings, UserRole.CUSTOMER)
    customer_record(database, customer_user)
    active_quote = client.post(
        f"{API}/quotations",
        headers=customer_headers,
        json={"lines": [{"product_id": product.json()["id"], "variant_id": active_variant["id"], "quantity": 1}]},
    )
    assert active_quote.status_code == 201
    assert active_quote.json()["lines"][0]["unit_price_paise"] == 25_000
    inactive_quote = client.post(
        f"{API}/quotations",
        headers=customer_headers,
        json={"lines": [{"product_id": product.json()["id"], "variant_id": retired_variant["id"], "quantity": 1}]},
    )
    assert inactive_quote.status_code == 404
    rejected_quote = client.post(
        f"{API}/quotations",
        headers=customer_headers,
        json={"lines": [{"product_id": product.json()["id"], "quantity": 1}]},
    )
    rejected = client.post(
        f"{API}/quotations/{rejected_quote.json()['id']}/reject",
        headers=customer_headers,
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"

    now = now_utc()
    plan = client.post(
        f"{API}/plans",
        headers=staff_headers,
        json={
            "name": "Monthly searchable plan",
            "description": "Monthly plan description",
            "price_paise": 50_000,
            "frequency": "monthly",
            "available_from": (now - timedelta(days=1)).isoformat(),
            "available_until": (now + timedelta(days=1)).isoformat(),
            "lifecycle_options": {"allowPause": True, "allowRenewal": True},
        },
    )
    assert plan.status_code == 201
    assert client.get(
        f"{API}/plans",
        headers=staff_headers,
        params={"q": "searchable", "frequency": "monthly", "available": True},
    ).json()["items"][0]["id"] == plan.json()["id"]

    discount = client.post(
        f"{API}/discounts",
        headers=admin_headers,
        json={
            "name": "Searchable discount",
            "discount_type": "percentage",
            "value": 500,
            "starts_at": (now - timedelta(days=1)).isoformat(),
            "ends_at": (now + timedelta(days=1)).isoformat(),
            "product_ids": [product.json()["id"]],
        },
    )
    assert discount.status_code == 201
    discount_id = discount.json()["id"]
    assert client.get(f"{API}/discounts/{discount_id}", headers=admin_headers).status_code == 200
    assert client.patch(
        f"{API}/discounts/{discount_id}",
        headers=admin_headers,
        json={"value": 20_000},
    ).status_code == 422
    assert client.delete(f"{API}/discounts/{discount_id}", headers=admin_headers).status_code == 204
    assert client.get(f"{API}/discounts/{discount_id}", headers=admin_headers).json()["is_active"] is False

    assert client.delete(f"{API}/customers/{customer_id}", headers=admin_headers).status_code == 204
