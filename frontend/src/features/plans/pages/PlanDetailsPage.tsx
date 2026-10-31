import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";
import { PlanDetails } from "../components/PlanDetails";
import type { PlanRecord } from "../types";

function mapPlan(record: BusinessRecord): PlanRecord {
  const lifecycle = typeof record.lifecycle_options === "object" && record.lifecycle_options !== null
    ? record.lifecycle_options as Record<string, unknown> : {};
  const date = (value: unknown) => typeof value === "string" ? value.slice(0, 10) : "";
  return {
    id: record.id,
    name: String(record.name ?? ""),
    price: Number(record.price_paise ?? 0) / 100,
    frequency: record.frequency === "daily" || record.frequency === "weekly" || record.frequency === "yearly" ? record.frequency : "monthly",
    minimumQuantity: Number(record.min_quantity ?? 1),
    availableFrom: date(record.available_from),
    availableUntil: date(record.available_until),
    autoCloseAtEnd: lifecycle.autoCloseAtEnd === true || lifecycle.auto_close_at_end === true,
    allowEarlyClosure: lifecycle.allowEarlyClosure === true || lifecycle.allow_early_closure === true,
    allowPause: lifecycle.allowPause === true || lifecycle.allow_pause === true,
    allowRenewal: lifecycle.allowRenewal === true || lifecycle.allow_renewal === true,
    isActive: record.is_active !== false,
  };
}

export function PlanDetailsPage() {
  const { planId = "" } = useParams();
  const [plan, setPlan] = useState<PlanRecord>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setPlan(mapPlan(await businessService.plans.get(planId))); }
    catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setLoading(false); }
  }, [planId]);
  useEffect(() => { void refresh(); }, [refresh]);
  return (
    <section aria-labelledby="plan-detail-title" className="mx-auto w-full max-w-5xl">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700" to="/app/plans"><ArrowLeft aria-hidden="true" size={17} />Back to plans</Link>
      <h1 className="mb-5 text-2xl font-semibold tracking-tight text-slate-900" id="plan-detail-title">Plan details</h1>
      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => void refresh()} type="button">Retry</button></p>}
      {loading ? <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading plan…</p> : <PlanDetails plan={plan} />}
    </section>
  );
}
