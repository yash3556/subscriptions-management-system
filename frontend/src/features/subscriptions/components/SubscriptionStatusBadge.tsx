import type { SubscriptionStatus } from "../types";

const styles: Record<SubscriptionStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  quotation: "bg-blue-50 text-blue-800",
  confirmed: "bg-indigo-50 text-indigo-800",
  active: "bg-emerald-50 text-emerald-800",
  paused: "bg-amber-50 text-amber-800",
  closed: "bg-slate-200 text-slate-700",
  expired: "bg-red-50 text-red-800",
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
      {status.replaceAll("_", " ")}
    </span>
  );
}
