import type { InvoiceStatus } from "../types";

const styles: Record<InvoiceStatus, string> = {
  Draft: "bg-slate-100 text-slate-700",
  Confirmed: "bg-blue-50 text-blue-800",
  Paid: "bg-emerald-50 text-emerald-800",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
