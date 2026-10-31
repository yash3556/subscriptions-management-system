from __future__ import annotations

from datetime import timedelta
from typing import Any

from bson import ObjectId
from fastapi import HTTPException

from app.services.business_service import new_number, now_utc
from app.utils.calculations import calculate_line_totals


def build_quotation_lines(database: Any, requested_lines: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for requested in requested_lines:
        quantity = requested["quantity"]
        if requested.get("product_id"):
            product = database.products.find_one(
                {"_id": ObjectId(requested["product_id"]), "is_active": True}
            )
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")
            unit_price = product["sales_price_paise"]
            variant = None
            if requested.get("variant_id"):
                variant = next(
                    (
                        item
                        for item in product.get("variants", [])
                        if item["id"] == requested["variant_id"]
                        and item.get("is_active", True)
                    ),
                    None,
                )
                if variant is None:
                    raise HTTPException(status_code=404, detail="Product variant not found")
                unit_price += variant["price_adjustment_paise"]
            tax_rate = product.get("tax_rate_bps", 0)
            line = {
                "item_type": "product",
                "product_id": product["_id"],
                "product_name": product["name"],
                "variant_id": variant["id"] if variant else None,
                "variant_name": variant["name"] if variant else None,
                "quantity": quantity,
                "unit_price_paise": unit_price,
                "tax_rate_bps": tax_rate,
            }
        else:
            plan = database.plans.find_one(
                {"_id": ObjectId(requested["plan_id"]), "is_active": True}
            )
            if not plan:
                raise HTTPException(status_code=404, detail="Plan not found")
            now = now_utc()
            if plan.get("available_from") and now < plan["available_from"]:
                raise HTTPException(status_code=409, detail="Plan is not yet available")
            if plan.get("available_until") and now > plan["available_until"]:
                raise HTTPException(status_code=409, detail="Plan is no longer available")
            if quantity < plan.get("min_quantity", 1):
                raise HTTPException(status_code=422, detail="Quantity is below the plan minimum")
            line = {
                "item_type": "plan",
                "plan_id": plan["_id"],
                "plan_name": plan["name"],
                "frequency": plan["frequency"],
                "lifecycle_options": plan.get("lifecycle_options", {}),
                "quantity": quantity,
                "unit_price_paise": plan["price_paise"],
                "tax_rate_bps": plan.get("tax_rate_bps", 0),
            }
        line.update(calculate_line_totals(
            quantity=quantity,
            unit_price_paise=line["unit_price_paise"],
            tax_rate_bps=line["tax_rate_bps"],
        ))
        result.append(line)
    return result


def create_quotation(
    database: Any,
    *,
    customer_id: ObjectId,
    requested_lines: list[dict[str, Any]],
    validity_days: int,
    created_by: ObjectId,
    notes: str | None = None,
) -> dict[str, Any]:
    now = now_utc()
    lines = build_quotation_lines(database, requested_lines)
    document = {
        "number": new_number("QUO"),
        "customer_id": customer_id,
        "lines": lines,
        "subtotal_paise": sum(line["subtotal_paise"] for line in lines),
        "tax_paise": sum(line["tax_paise"] for line in lines),
        "total_paise": sum(line["total_paise"] for line in lines),
        "currency": "INR",
        "validity_days": validity_days,
        "valid_until": now + timedelta(days=validity_days),
        "status": "quotation",
        "customer_accepted_at": None,
        "confirmed_at": None,
        "notes": notes,
        "created_by": created_by,
        "history": [{"status": "quotation", "at": now, "actor_id": created_by}],
        "created_at": now,
        "updated_at": now,
    }
    inserted = database.quotations.insert_one(document)
    document["_id"] = inserted.inserted_id
    return document
