from pymongo import ASCENDING, IndexModel
from pymongo.database import Database


def create_indexes(database: Database) -> None:
    database.users.create_indexes(
        [
            IndexModel(
                [("email", ASCENDING)],
                unique=True,
                name="uq_users_email",
            )
        ]
    )
    database.refresh_tokens.create_indexes(
        [
            IndexModel(
                [("current_token_hash", ASCENDING)],
                unique=True,
                name="uq_refresh_current_hash",
            ),
            IndexModel(
                [("used_token_hashes", ASCENDING)],
                name="ix_refresh_used_hashes",
            ),
            IndexModel(
                [("expires_at", ASCENDING)],
                expireAfterSeconds=0,
                name="ttl_refresh_expiry",
            ),
            IndexModel(
                [("user_id", ASCENDING), ("revoked_at", ASCENDING)],
                name="ix_refresh_user_revoked",
            ),
        ]
    )
    database.password_reset_tokens.create_indexes(
        [
            IndexModel(
                [("token_hash", ASCENDING)],
                unique=True,
                name="uq_password_reset_hash",
            ),
            IndexModel(
                [("user_id", ASCENDING)],
                name="ix_password_reset_user",
            ),
            IndexModel(
                [("expires_at", ASCENDING)],
                expireAfterSeconds=0,
                name="ttl_password_reset_expiry",
            ),
        ]
    )
    database.auth_rate_limits.create_indexes(
        [
            IndexModel(
                [("expires_at", ASCENDING)],
                expireAfterSeconds=0,
                name="ttl_auth_rate_limit_expiry",
            )
        ]
    )
    database.customers.create_indexes(
        [
            IndexModel(
                [("user_id", ASCENDING)],
                unique=True,
                sparse=True,
                name="uq_customers_user_id",
            ),
            IndexModel([("email", ASCENDING)], unique=True, name="uq_customers_email"),
        ]
    )
    database.products.create_indexes(
        [
            IndexModel([("name", ASCENDING)], name="ix_products_name"),
            IndexModel([("is_active", ASCENDING), ("name", ASCENDING)], name="ix_products_active_name"),
        ]
    )
    database.plans.create_indexes(
        [
            IndexModel([("name", ASCENDING)], name="ix_plans_name"),
            IndexModel([("is_active", ASCENDING), ("name", ASCENDING)], name="ix_plans_active_name"),
        ]
    )
    database.quotations.create_indexes(
        [
            IndexModel([("number", ASCENDING)], unique=True, name="uq_quotations_number"),
            IndexModel([("customer_id", ASCENDING), ("created_at", -1)], name="ix_quotations_customer_created"),
        ]
    )
    database.subscriptions.create_indexes(
        [
            IndexModel([("number", ASCENDING)], unique=True, name="uq_subscriptions_number"),
            IndexModel([("quotation_id", ASCENDING)], unique=True, sparse=True, name="uq_subscriptions_quotation"),
            IndexModel([("customer_id", ASCENDING), ("status", ASCENDING)], name="ix_subscriptions_customer_status"),
            IndexModel([("status", ASCENDING), ("next_billing_at", ASCENDING)], name="ix_subscriptions_due"),
            IndexModel([("status", ASCENDING), ("expires_at", ASCENDING)], name="ix_subscriptions_status_expiry"),
        ]
    )
    database.invoices.create_indexes(
        [
            IndexModel([("number", ASCENDING)], unique=True, name="uq_invoices_number"),
            IndexModel(
                [("subscription_id", ASCENDING), ("billing_period_start", ASCENDING)],
                unique=True,
                partialFilterExpression={"subscription_id": {"$type": "objectId"}},
                name="uq_invoice_subscription_period",
            ),
            IndexModel([("customer_id", ASCENDING), ("status", ASCENDING), ("due_at", ASCENDING)], name="ix_invoices_customer_status_due"),
        ]
    )
    database.payments.create_indexes(
        [
            IndexModel(
                [("invoice_id", ASCENDING), ("idempotency_key", ASCENDING)],
                unique=True,
                name="uq_payment_invoice_idempotency",
            ),
            IndexModel([("invoice_id", ASCENDING), ("recorded_at", ASCENDING)], name="ix_payments_invoice_date"),
            IndexModel([("customer_id", ASCENDING), ("recorded_at", -1)], name="ix_payments_customer_date"),
        ]
    )
    database.discounts.create_indexes(
        [IndexModel([("is_active", ASCENDING), ("starts_at", ASCENDING), ("ends_at", ASCENDING)], name="ix_discounts_active_dates")]
    )
    database.discount_redemptions.create_indexes(
        [
            IndexModel(
                [("discount_id", ASCENDING), ("subscription_id", ASCENDING), ("billing_period_start", ASCENDING)],
                unique=True,
                name="uq_discount_redemption_invoice",
            )
        ]
    )