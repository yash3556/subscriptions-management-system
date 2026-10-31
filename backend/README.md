# Brightloop Subscription Management API

The backend provides the FastAPI foundation and Phase 2 authentication, role
management, staff administration, and authorization helpers. Subscription and
other business APIs are not implemented in this phase.

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
Reset links expire after 15 minutes and are single-use. The raw reset token is
only included in the emailed frontend URL; MongoDB stores its SHA-256 hash.
Email is sent immediately as a FastAPI background task after the generic
response. A successful `password_reset_email_accepted_by_smtp` log means the
SMTP server accepted the message, not that it reached the recipient's inbox.

Configure SMTP in the local `.env` or deployment environment; never commit
credentials. For Gmail, use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`,
`SMTP_USE_TLS=true`, `SMTP_USE_SSL=false`, `SMTP_USERNAME`, `SMTP_PASSWORD`
(an app password), and `SMTP_FROM_EMAIL` matching the sending account.
Set `PASSWORD_RESET_URL` to the deployed frontend's `/reset-password` URL.

## Tests

```powershell
python -m pytest
```

Tests use an isolated in-memory Mongo-compatible database and do not require a
live database. Use `/health/ready` to verify connectivity to the configured
MongoDB instance.
