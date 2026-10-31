import type { InvoiceStatus } from "../types";

const styles: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-50 text-blue-800",
  paid: "bg-emerald-50 text-emerald-800",
  cancelled: "bg-red-50 text-red-800",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}
