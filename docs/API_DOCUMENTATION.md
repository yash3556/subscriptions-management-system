# Brightloop API — Authentication and User Management

## Conventions

- API prefix: `/api/v1`.
- JSON errors use `{ "detail": "...", "code": "...", "request_id": "..." }`.
- MongoDB failures return HTTP 503 without database details.
- Email addresses are trimmed and Unicode-casefolded before storage and lookup.
  The unique `users.email` index enforces this normalization under concurrent
  registration.
- Customer registration always creates the `CUSTOMER` role. Role and permission
  fields in public registration requests are rejected.
- Passwords must exceed 8 characters and contain uppercase, lowercase, and a
  non-whitespace special character. Passwords longer than bcrypt's 72 UTF-8
  byte limit are rejected. Only bcrypt hashes are persisted.

## User registration

`POST /api/v1/auth/register`

Request:

```json
{
  "name": "Alex Customer",
  "email": "alex@example.com",
  "password": "SecurePass!9"
}
```

Response (`201 Created`):

```json
{
  "id": "6659d80dbb624d1cfeb7e710",
  "name": "Alex Customer",
  "email": "alex@example.com",
  "role": "CUSTOMER",
  "permissions": [],
  "is_active": true,
  "created_at": "2026-10-31T12:00:00Z"
}
```

Duplicate normalized email returns `409 Conflict`. Invalid input returns `422`.

## Login and current user

`POST /api/v1/auth/login`

Request:

```json
{ "email": "alex@example.com", "password": "SecurePass!9" }
```

Response (`200 OK`):

```json
{
  "access_token": "<short-lived signed JWT>",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "6659d80dbb624d1cfeb7e710",
    "name": "Alex Customer",
    "email": "alex@example.com",
    "role": "CUSTOMER",
    "permissions": [],
    "is_active": true,
    "created_at": "2026-10-31T12:00:00Z"
  }
}
```

The refresh token is only set in the `HttpOnly` `brightloop_refresh` cookie; it
is never included in JSON. The `brightloop_csrf` cookie is readable by the
frontend. Access-token requests use `Authorization: Bearer <access_token>`.
Invalid credentials have the same generic `401` response for unknown, inactive,
and password-mismatch accounts.

`GET /api/v1/auth/me` returns the authenticated user's current database-backed
role and permissions. Roles and permissions are not taken from JWT claims.

## Refresh, CSRF and logout

`GET /api/v1/auth/csrf` sets `brightloop_csrf` and returns
`{ "csrf_token": "<token>" }`. The frontend must send the cookie value in the
`X-CSRF-Token` header for `POST /api/v1/auth/refresh` and
`POST /api/v1/auth/logout`. These endpoints also enforce the configured
`Origin` when the request includes one.

Refresh requests include cookies and return a new access token. The refresh
cookie rotates on every successful refresh. Tokens are random opaque values;
only SHA-256 hashes are stored. Reuse of a previously rotated token revokes
that token family. Logout requires a valid bearer access token and CSRF proof;
it revokes all refresh sessions for the user and increments the access-token
version, invalidating all of that user's existing access tokens.

JWT access tokens use HS256, a required environment signing key, configured
issuer and audience, and a short configurable expiry (default 15 minutes).
Refresh sessions have a fixed absolute expiry (default 7 days). Deactivated
users and stale token versions are rejected on each protected request.

## Password reset

`POST /api/v1/auth/forgot-password`

```json
{ "email": "alex@example.com" }
```

Returns `202 Accepted` with the same message whether the account exists or not.
The API sends a single-use, time-limited link using environment-configured SMTP
with an in-process background task after the response. Delivery failures are
logged safely and do not change the generic public response. Delivery is not
backed by a durable queue; production deployments needing guaranteed delivery
should add an outbox/queue in a later reliability phase.

Response:

```json
{ "message": "If the account exists, a reset link will be sent" }
```

`POST /api/v1/auth/reset-password`

```json
{ "token": "<single-use-token>", "new_password": "NewSecurePass!9" }
```

Successful reset returns `200`. Expired, unknown, and reused tokens return the
same `400` error. Reset invalidates all existing refresh sessions and access
tokens for that account.

Response:

```json
{ "message": "Password reset successfully" }
```

## Staff administration

All `/api/v1/staff` operations require `ADMIN`:

- `POST /api/v1/staff`: create an `INTERNAL_STAFF` account.
- `GET /api/v1/staff?limit=50&offset=0`: list staff, bounded to 100 per page.
- `GET /api/v1/staff/{user_id}`: view a staff account.
- `PATCH /api/v1/staff/{user_id}/status`: `{ "is_active": false }`.
- `PUT /api/v1/staff/{user_id}/permissions`: `{ "permissions": [...] }`.

Create-staff request:

```json
{
  "name": "Morgan Staff",
  "email": "morgan@example.com",
  "password": "SecureStaff!9",
  "permissions": ["invoices:read", "subscriptions:read"]
}
```

The `201 Created` response uses the standard user shape with
`"role": "INTERNAL_STAFF"` and the assigned permissions. Listing returns a JSON
array of this same shape. Status and permission updates return the updated user.

The fixed proposed staff permission catalog is:
`customers:read`, `customers:write`, `products:read`, `products:write`,
`plans:read`, `plans:write`, `quotations:read`, `quotations:write`,
`subscriptions:read`, `subscriptions:write`, `invoices:read`,
`invoices:write`, `payments:read`, `payments:write`, `discounts:read`,
`discounts:write`, and `reports:read`. Admin-only user/staff management
permissions are intentionally not assignable. The backend helper
`require_permission(...)` checks this catalog against the current database
record; future business routes must attach it to every protected endpoint.

Customer ownership helper `ensure_customer_owns_resource(...)` returns 404 for
another customer's resource. Future invoice, subscription, payment, and other
customer-resource routes must call it after loading each resource.

## Historical frontend integration status (superseded)

The frontend Axios client uses `VITE_API_BASE_URL` (default
`http://localhost:8000/api/v1`), sends credentials, and keeps the access token
in memory for bearer-authenticated requests. On app startup it obtains a CSRF
token and refreshes the session; the refresh response already includes the
current database-backed user profile. Refresh and logout send the CSRF token in
`X-CSRF-Token`.

The login and registration forms are connected to their documented endpoints.
Customer routes require a customer session; internal routes require an
authenticated Admin or Internal Staff account, with staff route visibility and
access checked against the documented permission catalog. Staff management is
connected to the documented `/api/v1/staff` operations and is Admin-only.

Business screens are not API-integrated: customer, product, plan, quotation,
subscription, invoice, payment, discount, dashboard, and report endpoints and
their business response schemas are not implemented yet. In particular, the
Customer Portal cannot load subscriptions, invoices, or payments until
customer-specific endpoints and their ownership enforcement are implemented.

The business API has since been implemented. The current endpoint contract and
frontend integration caveat are documented in
[`BUSINESS_API.md`](./BUSINESS_API.md); use that document instead of the
historical statements above.