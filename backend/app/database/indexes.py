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