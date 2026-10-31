import type { SubscriptionStatus } from "../types";

const styles: Record<SubscriptionStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Quotation: "bg-blue-50 text-blue-800",
  Confirmed: "bg-indigo-50 text-indigo-800",
  Active: "bg-emerald-50 text-emerald-800",
  Closed: "bg-slate-200 text-slate-700",
};

export function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
