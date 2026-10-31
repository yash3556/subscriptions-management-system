import { CalendarDays, CircleDollarSign } from "lucide-react";
import type { PlanRecord } from "../types";

interface PlanDetailsProps {
  plan?: PlanRecord;
}

const frequencyLabels: Record<PlanRecord["frequency"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | undefined) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

function SettingValue({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        enabled
          ? "bg-emerald-50 text-emerald-800"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {enabled ? "Allowed" : "Not allowed"}
    </span>
  );
}

export function PlanDetails({ plan }: PlanDetailsProps) {
  if (!plan) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Plan details unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Plan details are not available in this navigation state. Plan records
          will be connected after backend integration.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Plan configuration
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Plan name
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{plan.name}</dd>
          </div>
          <div className="flex gap-3">
            <CircleDollarSign
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-slate-400"
              size={18}
            />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Price
              </dt>
              <dd className="mt-1 text-sm tabular-nums text-slate-900">
                {formatPrice(plan.price)}
              </dd>
            </div>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Billing frequency
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {frequencyLabels[plan.frequency]}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Minimum quantity
            </dt>
            <dd className="mt-1 text-sm tabular-nums text-slate-900">
              {plan.minimumQuantity}
            </dd>
          </div>
        </dl>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="text-slate-400" size={18} />
          <h2 className="font-semibold text-slate-900">Availability</h2>
        </div>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Available from
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {formatDate(plan.availableFrom)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Available until
            </dt>
            <dd className="mt-1 text-sm text-slate-900">
              {formatDate(plan.availableUntil)}
            </dd>
          </div>
        </dl>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900">Lifecycle options</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-slate-700">Automatically close at end</dt>
            <dd>
              <SettingValue enabled={plan.autoCloseAtEnd} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-slate-700">Early closure</dt>
            <dd>
              <SettingValue enabled={plan.allowEarlyClosure} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-slate-700">Pausing</dt>
            <dd>
              <SettingValue enabled={plan.allowPause} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-slate-700">Renewal</dt>
            <dd>
              <SettingValue enabled={plan.allowRenewal} />
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
