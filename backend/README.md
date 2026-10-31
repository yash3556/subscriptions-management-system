# Brightloop Subscription Management API

The backend is a FastAPI service for subscription and recurring billing
management. It includes authentication and staff authorization, customer and
catalog management, quotations, subscriptions, invoices, discounts, payments,
and billing analytics.

## Requirements

- Python 3.11 or newer
- MongoDB reachable using the configured `MONGODB_URI`

## Install

From the repository root in PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Set the MongoDB and JWT configuration in `.env`. Generate a local signing key
without committing it:

```powershell
Add-Content .env ("JWT_SECRET_KEY=" + (python -c "import secrets; print(secrets.token_urlsafe(48))"))
```

`.env` is ignored by Git. Never use a development signing key in production.
Configure SMTP and a reachable MongoDB instance before deploying.
Terminate HTTPS at the production reverse proxy and set `AUTH_COOKIE_SECURE=true`.

## Run

```powershell
uvicorn app.main:app --reload
```

The API listens on `http://127.0.0.1:8000` by default. Interactive OpenAPI docs
are available at `/docs`.

## Health checks

- `GET /health/live` reports whether the process is alive; it does not depend on MongoDB.
- `GET /health/ready` checks MongoDB and returns HTTP 503 when it is unavailable.
- `GET /health` is the readiness check alias.

MongoDB connection and selection are bounded by the timeout settings in `.env`.
Startup makes one connectivity attempt and creates the required indexes when
MongoDB is available. If startup cannot connect, the service stays live but not
ready; requests that need MongoDB return a sanitized HTTP 503.

## Configuration

See `.env.example` for supported settings. `FRONTEND_ALLOWED_ORIGINS` is a
comma-separated list of explicit origins; wildcard origins are rejected.
`JWT_SECRET_KEY` is required and must be at least 32 characters. Production
authentication cookies must use `Secure`. Login throttling uses MongoDB-backed
fixed windows keyed by HMACs of normalized email and client IP.

## Authentication and bootstrap

The authentication API is mounted at `/api/v1/auth`; staff administration is at
`/api/v1/staff`. See [`../docs/API_DOCUMENTATION.md`](../docs/API_DOCUMENTATION.md)
for request/response examples, cookie/CSRF behavior, permissions, and frontend
integration requirements. OpenAPI includes the request and response schemas.

## Business workflows

Business endpoints are mounted under `/api/v1`. The main sales-to-payment flow
is:

1. A customer or authorized staff member creates a quotation.
2. The customer accepts it; authorized staff confirms it, creating one
   subscription for that quotation.
3. Authorized staff activates the subscription. Its start time becomes the
   first billing date.
4. The billing worker generates due invoices. Invoices start as drafts and
   authorized staff confirms them before payment.
5. Customers can make partial payments against their own confirmed invoices.
   The API reports the outstanding balance and marks an invoice paid when the
   balance reaches zero. `Idempotency-Key` prevents a retried payment from
   being applied twice.

The billing worker runs periodically while the API is running. Subscription
activation, manual closure, and expiration are supported; closure or expiration
clears the next billing date. Recurring billing and payment reconciliation use
MongoDB-backed records and indexes to prevent duplicate invoices and payments.

## Email delivery

SMTP is used for password-reset email only. Set `SMTP_HOST`, `SMTP_PORT`,
`SMTP_FROM_EMAIL`, and, when required by the server, `SMTP_USERNAME` and
`SMTP_PASSWORD`. Delivery is performed in a background task; configure a
reachable SMTP server and verify delivery in the target environment before
relying on it. The automated tests mock delivery and do not validate a real
SMTP server.

Create the first administrator interactively after configuring `.env` and
starting MongoDB:

```powershell
python -m app.cli create-admin
```

This command prompts for the initial admin credentials and refuses a second
bootstrap. Customer registration can only create `CUSTOMER` users; the public
API does not accept a role field.

Password reset requires configured SMTP settings. Responses remain generic if
an address is unknown or email delivery fails; delivery failures are logged
without the recipient, reset token, message, or SMTP credentials.

## Tests

Run from the `backend` directory with its virtual environment activated:

```powershell
python -m pytest
```

Tests use an isolated in-memory Mongo-compatible database and do not require a
live database. They verify application behavior, not connectivity to a
deployed MongoDB or SMTP service. Use `/health/ready` to verify connectivity to
the configured MongoDB instance.
