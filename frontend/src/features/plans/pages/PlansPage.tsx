import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import {
  businessService,
  getBusinessErrorMessage,
  type BusinessRecord,
} from "../../../services/businessService";
import { PlanFormDialog } from "../components/PlanFormDialog";
import { PlanSearch } from "../components/PlanSearch";
import { PlanTable } from "../components/PlanTable";
import type { PlanFormValues, PlanRecord } from "../types";

function mapPlan(record: BusinessRecord): PlanRecord {
  const options = typeof record.lifecycle_options === "object" && record.lifecycle_options !== null
    ? record.lifecycle_options as Record<string, unknown>
    : {};
  const dateValue = (value: unknown) =>
    typeof value === "string" ? value.slice(0, 10) : "";
  return {
    id: record.id,
    name: typeof record.name === "string" ? record.name : "",
    price: typeof record.price_paise === "number" ? record.price_paise / 100 : 0,
    frequency: record.frequency === "daily" || record.frequency === "weekly" || record.frequency === "yearly" ? record.frequency : "monthly",
    minimumQuantity: typeof record.min_quantity === "number" ? record.min_quantity : 1,
    availableFrom: dateValue(record.available_from),
    availableUntil: dateValue(record.available_until),
    autoCloseAtEnd: options.autoCloseAtEnd === true || options.auto_close_at_end === true,
    allowEarlyClosure: options.allowEarlyClosure === true || options.allow_early_closure === true,
    allowPause: options.allowPause === true || options.allow_pause === true,
    allowRenewal: options.allowRenewal === true || options.allow_renewal === true,
    isActive: record.is_active !== false,
  };
}

function toApiDate(value: string, endOfDay = false): string | null {
  if (!value) return null;
  return `${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

export function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null);
  const navigate = useNavigate();
  const canWrite =
    user?.role === "ADMIN" ||
    (user?.role === "INTERNAL_STAFF" && user.permissions.includes("plans:write"));

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await businessService.plans.list(search);
      setPlans(result.items.map(mapPlan));
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function handleSubmit(values: PlanFormValues) {
    setIsSaving(true);
    setError("");
    setNotice("");
    const payload = {
      name: values.name.trim(),
      price_paise: Math.round(Number(values.price) * 100),
      frequency: values.frequency,
      min_quantity: Number(values.minimumQuantity),
      available_from: toApiDate(values.availableFrom),
      available_until: toApiDate(values.availableUntil, true),
      lifecycle_options: {
        autoCloseAtEnd: values.autoCloseAtEnd,
        allowEarlyClosure: values.allowEarlyClosure,
        allowPause: values.allowPause,
        allowRenewal: values.allowRenewal,
      },
    };
    try {
      if (formMode === "edit" && selectedPlan) {
        await businessService.plans.update(selectedPlan.id, payload);
        setNotice("Plan updated.");
      } else {
        await businessService.plans.create(payload);
        setNotice("Plan created.");
      }
      setFormMode(null);
      setSelectedPlan(null);
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(plan: PlanRecord) {
    if (!window.confirm(`Deactivate ${plan.name}? Existing subscriptions are unaffected.`)) return;
    setError("");
    try {
      await businessService.plans.deactivate(plan.id);
      setNotice("Plan deactivated.");
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    }
  }

  return (
    <section aria-labelledby="plans-title" className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="plans-title">Subscription Plans</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Configure plan pricing, billing frequency, availability, and lifecycle options.</p>
        </div>
        {canWrite && <button className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800" onClick={() => { setSelectedPlan(null); setFormMode("add"); }} type="button"><Plus aria-hidden="true" size={18} /> Add plan</button>}
      </div>
      {(error || notice) && <p className={`mt-4 rounded-md border px-3 py-2.5 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5"><PlanSearch onChange={setSearch} value={search} /></div>
      <div className="mt-4">
        {isLoading ? <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600" aria-live="polite">Loading plans…</p> : (
          <PlanTable canWrite={canWrite} onDeactivate={(plan) => void handleDeactivate(plan)} onEdit={(plan) => { setSelectedPlan(plan); setFormMode("edit"); }} onView={(plan) => navigate(`/app/plans/details/${plan.id}`)} plans={plans} />
        )}
      </div>
      {formMode && <PlanFormDialog isSubmitting={isSaving} notice={error} onClose={() => { if (!isSaving) { setFormMode(null); setSelectedPlan(null); setError(""); } }} onSubmit={handleSubmit} plan={selectedPlan ?? undefined} submitLabel={formMode === "add" ? "Save plan" : "Save changes"} title={formMode === "add" ? "Add subscription plan" : "Edit plan"} />}
    </section>
  );
}
