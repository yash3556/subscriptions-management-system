# Brightloop Database — Phase 2 Authentication

MongoDB database name is selected by `MONGODB_DATABASE`. All timestamps are UTC.
Indexes are created by the application during startup after a successful
connection.

## `users`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `name` | string | Trimmed display name |
| `email` | string | Trimmed and Unicode-casefolded; unique index |
| `password_hash` | string | bcrypt hash only; never returned by APIs |
| `role` | string | Exactly `ADMIN`, `INTERNAL_STAFF`, `CUSTOMER` |
| `permissions` | string[] | Catalog-limited; used only for Internal Staff |
| `is_active` | boolean | Inactive users cannot authenticate |
| `token_version` | integer | Incremented on logout, password reset and staff status changes |
| `created_at`, `updated_at` | UTC datetime | Audit timestamps |

Indexes: unique `{ email: 1 }`.

Email normalization is `strip().casefold()` before both insert and lookup. This
intentionally treats email addresses as case-insensitive to avoid duplicate
accounts that differ only by letter case.

## `refresh_tokens`

One document per browser/device refresh-token family.

| Field | Type | Notes |
|---|---|---|
| `_id` | random string | Family identifier |
| `user_id` | ObjectId | References `users._id` |
| `token_version` | integer | User version when this session family was created |
| `current_token_hash` | string | SHA-256 hash of only the currently valid token |
| `used_token_hashes` | string[] | Hashes retained for replay detection |
| `created_at`, `expires_at` | UTC datetime | Absolute family lifetime; TTL on `expires_at` |
| `revoked_at` | UTC datetime/null | Rotation reuse, logout, deactivation/reset revocation |

Indexes: unique current hash, used-hash lookup, `{ expires_at: 1 }` TTL, and
`{ user_id: 1, revoked_at: 1 }`.

## `password_reset_tokens`

| Field | Type | Notes |
|---|---|---|
| `user_id` | ObjectId | References `users._id` |
| `token_hash` | string | Unique SHA-256 hash; raw token is only emailed |
| `created_at`, `expires_at` | UTC datetime | Configured expiry; TTL on `expires_at` |
| `used_at` | UTC datetime/null | Atomic single-use claim |

Only the latest reset token per user is retained. Reset consumes the token
atomically, changes the bcrypt password hash, increments token version, and
revokes refresh sessions.

## `auth_rate_limits`

Fixed-window counters have `_id` values formed from HMACs of the normalized
email and client IP plus the time bucket. Raw email and IP are not stored.
Attempts are atomically incremented; a TTL index deletes expired counters.
Defaults are five attempts per 15-minute window.

## Bootstrap marker

`admin_bootstrap` uses the reserved `_id: "initial_admin"` as a one-time claim
for `python -m app.cli create-admin`. The CLI refuses when an admin already
exists. The marker contains no credentials.

## Transactions and race handling

No multi-document transaction is assumed. Unique indexes and atomic
single-document operations enforce normalized-email uniqueness, one-time reset
use, refresh rotation/reuse detection, rate-counter increments, and logout
revocation. Refresh rejects families whose saved token version differs from the
current user record. MongoDB must be configured with the required indexes before
production traffic is accepted. A failed operation returns an explicit
sanitized error response; transaction-dependent business modules are not part
of this phase.