import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { InvoiceDetails } from "../components/InvoiceDetails";
import type { InvoiceRecord, InvoiceStatus } from "../types";

const statuses: InvoiceStatus[] = ["Draft", "Confirmed", "Paid"];

function isInvoiceRecord(value: unknown): value is InvoiceRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "number" in value &&
    typeof value.number === "string" &&
    "customer" in value &&
    typeof value.customer === "string" &&
    "subscriptionNumber" in value &&
    typeof value.subscriptionNumber === "string" &&
    "status" in value &&
    typeof value.status === "string" &&
    statuses.includes(value.status as InvoiceStatus) &&
    "lines" in value &&
    Array.isArray(value.lines) &&
    "total" in value &&
    typeof value.total === "number"
  );
}

export function InvoiceDetailsPage() {
  const location = useLocation();
  const invoice = isInvoiceRecord(location.state) ? location.state : undefined;

  return (
    <section
      aria-labelledby="invoice-detail-title"
      className="mx-auto w-full max-w-5xl"
    >
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
        to="/app/invoices"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Back to invoices
      </Link>
      <div className="mb-5">
        <h1
          className="text-2xl font-semibold tracking-tight text-slate-900"
          id="invoice-detail-title"
        >
          Invoice details
        </h1>
      </div>
      <InvoiceDetails invoice={invoice} />
    </section>
  );
}
