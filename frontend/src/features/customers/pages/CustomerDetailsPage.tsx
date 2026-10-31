import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CustomerDetails } from "../components/CustomerDetails";
import type { CustomerDetailsRecord } from "../types";

function isCustomerDetailsRecord(value: unknown): value is CustomerDetailsRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string"
  );
}

export function CustomerDetailsPage() {
  const location = useLocation();
  const customer = isCustomerDetailsRecord(location.state)
    ? location.state
    : undefined;

  return (
    <section className="mx-auto w-full max-w-5xl" aria-labelledby="customer-detail-title">
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        to="/app/customers"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Back to customers
      </Link>
      <div className="mb-5">
        <h1
          className="text-2xl font-semibold tracking-tight text-slate-900"
          id="customer-detail-title"
        >
          Customer details
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Contact and billing information.
        </p>
      </div>
      <CustomerDetails customer={customer} />
    </section>
  );
}
