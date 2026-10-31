import type { QuotationRecord } from "../types";

interface QuotationTableProps {
  quotations: QuotationRecord[];
  canWrite?: boolean;
  canEdit?: boolean;
  busyId?: string;
  onEdit: (quotation: QuotationRecord) => void;
  onSend: (quotation: QuotationRecord) => void;
  onDelete: (quotation: QuotationRecord) => void;
  onConfirm: (quotation: QuotationRecord) => void;
}

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}

export function QuotationTable({ quotations, canWrite = false, canEdit = canWrite, busyId, onEdit, onSend, onDelete, onConfirm }: QuotationTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-230 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600"><tr>
            <th className="px-5 py-3.5">Quotation</th><th className="px-5 py-3.5">Customer</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Valid until</th><th className="px-5 py-3.5 text-right">Total</th><th className="px-5 py-3.5 text-right">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">{quotations.map((quote) => {
            const busy = busyId === quote.id;
            const editable = canWrite && quote.status === "quotation" && !quote.customerAcceptedAt;
            return <tr className="text-slate-700" key={quote.id}>
              <th className="px-5 py-4 font-medium text-slate-900">{quote.number}</th><td className="px-5 py-4">{quote.customerName}</td><td className="px-5 py-4 capitalize">{quote.status}</td><td className="px-5 py-4">{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : "—"}</td><td className="px-5 py-4 text-right tabular-nums">{money(quote.totalPaise)}</td>
              <td className="px-5 py-3"><div className="flex flex-wrap justify-end gap-1">
                {editable && canEdit && <button className="rounded px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50" disabled={busy} onClick={() => onEdit(quote)} type="button">Edit</button>}
                {editable && <button className="rounded px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50" disabled={busy || Boolean(quote.sentAt)} onClick={() => onSend(quote)} type="button">{quote.sentAt ? "Sent" : "Send"}</button>}
                {editable && <button className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={busy} onClick={() => onDelete(quote)} type="button">Delete</button>}
                {canWrite && quote.status === "quotation" && Boolean(quote.customerAcceptedAt) && <button className="rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50" disabled={busy} onClick={() => onConfirm(quote)} type="button">{busy ? "Working…" : "Convert to subscription"}</button>}
              </div></td>
            </tr>;
          })}
          {quotations.length === 0 && <tr><td className="px-5 py-14 text-center text-slate-500" colSpan={6}>No quotations found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
