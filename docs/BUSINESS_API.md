# Brightloop Business API

This is the current business API contract. All paths use the `/api/v1` prefix.
Except where noted, requests require `Authorization: Bearer <access-token>`.
Money is stored and returned as integer paise. List responses use
`{"items": [...], "page": n, "page_size": n}`.

## Conventions and roles

- `Admin` can perform all business operations.
- `Staff` needs the matching permission, such as `invoices:write`.
- `Customer` can access only its own records. A foreign record is returned as
  `404`, avoiding record-existence disclosure.
- Invalid request data returns `422`; unauthenticated/unauthorized requests
  return `401`/`403`; invalid state transitions and conflicts return `409`.
- Payments entered through this API are manual records, not gateway-verified
  transactions.

## Customers

| Method and path | Access | Request/query | Result |
|---|---|---|---|
| `GET /customers/me` | Customer | — | Current customer profile, created if absent |
| `GET /customers` | `customers:read` | `q`, `page`, `page_size` | Search name/email/phone |
| `POST /customers` | `customers:write` | `CustomerCreate` | `201`; creates customer |
| `GET /customers/{id}` | Owner or `customers:read` | — | Customer |
| `PATCH /customers/{id}` | Owner or `customers:write` | `CustomerUpdate` | Updated customer |
| `DELETE /customers/{id}` | `customers:write` | — | `204`; refuses if business records exist |
| `GET /customers/{id}/quotations` | Owner or `customers:read` | Pagination | Customer quotations |
| `GET /customers/{id}/subscriptions` | Owner or `customers:read` | Pagination | Customer subscriptions |
| `GET /customers/{id}/invoices` | Owner or `customers:read` | Pagination | Customer invoices |
| `GET /customers/{id}/payments` | Owner or `customers:read` | Pagination | Recorded customer payments |

## Products and plans

| Method and path | Access | Request/query | Result |
|---|---|---|---|
| `GET /products` | Customer or `products:read` | `q`, `product_type`, `is_active`, pagination | Filtered products; customer view omits cost |
| `POST /products` | `products:write` | `ProductCreate` | `201`; server assigns variant IDs |
| `GET /products/{id}` | Customer or `products:read` | — | Product |
| `PATCH /products/{id}` | `products:write` | `ProductUpdate` | Updated product/variants |
| `DELETE /products/{id}` | `products:write` | — | `204`; deactivates product |
| `GET /plans` | Customer or `plans:read` | `q`, `frequency`, `is_active`, `available`, pagination | Filtered plans |
| `POST /plans` | `plans:write` | `PlanCreate` | `201`; validates frequency and availability |
| `GET /plans/{id}` | Customer or `plans:read` | — | Plan |
| `PATCH /plans/{id}` | `plans:write` | `PlanUpdate` | Updated plan |
| `DELETE /plans/{id}` | `plans:write` | — | `204`; deactivates plan |

Supported frequencies are `daily`, `weekly`, `monthly`, and `yearly`. Variant
and catalog pricing are selected server-side; quotation lines snapshot the
selected price and tax.

## Quotations

| Method and path | Access | Request/query | Result |
|---|---|---|---|
| `GET /quotations` | Owner or `quotations:read` | `status`, `q`, `customer_id`, pagination | Filtered quotations |
| `POST /quotations` | Customer or `quotations:write` | `QuotationCreate`; staff supplies `customer_id` | `201`; server calculates prices/tax |
| `GET /quotations/{id}` | Owner or `quotations:read` | — | Quotation |
| `PATCH /quotations/{id}` | `quotations:write` | `QuotationUpdate` | Updates an unaccepted quotation and recalculates totals |
| `DELETE /quotations/{id}` | `quotations:write` | — | `204`; unaccepted quotation only |
| `POST /quotations/{id}/send` | `quotations:write` | — | Marks sent; does not deliver email |
| `POST /quotations/{id}/accept` | Owning customer | — | Accepts valid quotation |
| `POST /quotations/{id}/reject` | Owning customer | — | Rejects an unaccepted quotation |
| `POST /quotations/{id}/expire` | `quotations:write` | — | Marks an already expired quotation |
| `POST /quotations/{id}/confirm` | `quotations:write` | — | Converts accepted quote into its unique subscription |

## Subscriptions

| Method and path | Access | Request/query | Result |
|---|---|---|---|
| `GET /subscriptions` | Owner or `subscriptions:read` | Pagination | Subscriptions |
| `GET /subscriptions/{id}` | Owner or `subscriptions:read` | — | Subscription |
| `GET /subscriptions/{id}/history` | Owner or `subscriptions:read` | — | Lifecycle event history |
| `POST /subscriptions/{id}/activate` | `subscriptions:write` | `SubscriptionActivate` | Activates confirmed subscription |
| `POST /subscriptions/{id}/pause` | `subscriptions:write` | — | Pauses active subscription |
| `POST /subscriptions/{id}/resume` | `subscriptions:write` | — | Resumes unexpired paused subscription |
| `POST /subscriptions/{id}/renew` | `subscriptions:write` | `SubscriptionRenew` | Renews closed/expired subscription |
| `POST /subscriptions/{id}/close` | `subscriptions:write` | — | Closes eligible subscription |

## Invoices and payments

| Method and path | Access | Request/query | Result |
|---|---|---|---|
| `GET /invoices` | Owner or `invoices:read` | `status`, `q`, `customer_id`, pagination | Invoices including `outstanding_paise` |
| `POST /invoices/from-subscription/{id}` | `invoices:write` | — | `201`; generates due invoice |
| `POST /invoices/run-billing` | Admin | — | Runs due billing cycle |
| `GET /invoices/{id}` | Owner or `invoices:read` | — | Invoice details and outstanding amount |
| `PATCH /invoices/{id}` | `invoices:write` | `InvoiceUpdate` | Updates due date/notes on a draft |
| `POST /invoices/{id}/confirm` | `invoices:write` | `InvoiceConfirmRequest` | Confirms draft |
| `POST /invoices/{id}/cancel` | `invoices:write` | — | Cancels unpaid invoice |
| `GET /payments` | Owner or `payments:read` | `invoice_id`, `status`, `method`, `q`, pagination | Payments |
| `GET /payments/{id}` | Owner or `payments:read` | — | Payment |
| `GET /payments/invoices/{invoice_id}` | Owner or `payments:read` | — | Recorded invoice payments |
| `POST /payments` | Invoice owner or `payments:write` | `PaymentCreate`, `Idempotency-Key` header | `201` new record, `200` same-key retry, `409` conflict/overpayment |

`PaymentCreate.method` is `cash`, `bank_transfer`, `upi`, `card`, or `other`.
The idempotency key is 8–128 characters. Invoice-period unique indexes prevent
duplicate recurring invoices; payment application uses an atomic balance
check. Payment APIs do not integrate a payment gateway.

## Discounts and reports

| Method and path | Access | Request/query | Result |
|---|---|---|---|
| `GET /discounts` | Customer or `discounts:read` | `q`, `is_active`, pagination | Active eligible discounts for customers |
| `POST /discounts` | Admin | `DiscountCreate` | `201`; referenced products validated |
| `GET /discounts/{id}` | Customer or `discounts:read` | — | Discount |
| `PATCH /discounts/{id}` | Admin | `DiscountUpdate` | Updates discount rule |
| `DELETE /discounts/{id}` | Admin | — | `204`; deactivates rule |
| `GET /dashboard/summary` | `reports:read` | — | Database-backed counts, revenue, balance and recent records |
| `GET /dashboard/revenue` | `reports:read` | `from_date`, `to_date` | Monthly recorded-payment totals |
| `GET /dashboard/overdue` | `reports:read` | Pagination | Outstanding overdue invoices |

The recurring worker runs while the API process is running. It reconciles
pending payment records and generates due invoices; expired, paused, and closed
subscriptions are not billed. History and invoice lines preserve financial
snapshots; catalog changes do not reprice existing records.

## Integration status and limits

The backend endpoints above persist through MongoDB. Automated SMTP delivery
and a real payment gateway are not verified/integrated. The frontend's current
`src/services/workspaceService.ts` still calls non-versioned `/api/...` routes
and uses demo camelCase record shapes; it must be adapted to this `/api/v1`
contract before the frontend and backend are end-to-end integrated.
