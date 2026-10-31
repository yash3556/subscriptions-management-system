import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PlanDetails } from "../components/PlanDetails";
import type { PlanRecord } from "../types";

function isPlanRecord(value: unknown): value is PlanRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    "frequency" in value &&
    typeof value.frequency === "string" &&
    "minimumQuantity" in value &&
    typeof value.minimumQuantity === "number" &&
    "autoCloseAtEnd" in value &&
    typeof value.autoCloseAtEnd === "boolean" &&
    "allowEarlyClosure" in value &&
    typeof value.allowEarlyClosure === "boolean" &&
    "allowPause" in value &&
    typeof value.allowPause === "boolean" &&
    "allowRenewal" in value &&
    typeof value.allowRenewal === "boolean"
  );
}

export function PlanDetailsPage() {
  const location = useLocation();
  const plan = isPlanRecord(location.state) ? location.state : undefined;

  return (
    <section
      aria-labelledby="plan-detail-title"
      className="mx-auto w-full max-w-5xl"
    >
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        to="/app/plans"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Back to plans
      </Link>
      <div className="mb-5">
        <h1
          className="text-2xl font-semibold tracking-tight text-slate-900"
          id="plan-detail-title"
        >
          Plan details
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Plan pricing, availability, and lifecycle configuration.
        </p>
      </div>
      <PlanDetails plan={plan} />
    </section>
  );
}
