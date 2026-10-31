import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { SubscriptionDetails } from "../components/SubscriptionDetails";
import type {
  SubscriptionRecord,
  SubscriptionStatus,
} from "../types";

const statuses: SubscriptionStatus[] = [
  "Draft",
  "Quotation",
  "Confirmed",
  "Active",
  "Closed",
];

function isSubscriptionRecord(value: unknown): value is SubscriptionRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "number" in value &&
    typeof value.number === "string" &&
    "customer" in value &&
    typeof value.customer === "string" &&
    "plan" in value &&
    typeof value.plan === "string" &&
    "status" in value &&
    typeof value.status === "string" &&
    statuses.includes(value.status as SubscriptionStatus) &&
    "lines" in value &&
    Array.isArray(value.lines)
  );
}

export function SubscriptionDetailsPage() {
  const location = useLocation();
  const subscription = isSubscriptionRecord(location.state)
    ? location.state
    : undefined;

  return (
    <section
      aria-labelledby="subscription-detail-title"
      className="mx-auto w-full max-w-5xl"
    >
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
        to="/app/subscriptions"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Back to subscriptions
      </Link>
      <div className="mb-5">
        <h1
          className="text-2xl font-semibold tracking-tight text-slate-900"
          id="subscription-detail-title"
        >
          Subscription details
        </h1>
      </div>
      <SubscriptionDetails subscription={subscription} />
    </section>
  );
}
