import { FileText } from "lucide-react";
import type { InvoiceRecord } from "../types";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

interface InvoiceTableProps {
  invoices: InvoiceRecord[];
  onView: (invoice: InvoiceRecord) => void;
}

export function InvoiceTable({ invoices, onView }: InvoiceTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-175 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3.5" scope="col">Invoice</th>
              <th className="px-5 py-3.5" scope="col">Customer</th>
              <th className="px-5 py-3.5" scope="col">Subscription</th>
              <th className="px-5 py-3.5" scope="col">Status</th>
              <th className="px-5 py-3.5 text-right" scope="col">Total</th>
              <th className="px-5 py-3.5" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <tr className="text-slate-700" key={invoice.number}>
                <th className="px-5 py-4 font-medium text-slate-900" scope="row">
                  {invoice.number}
                </th>
                <td className="px-5 py-4">{invoice.customer}</td>
                <td className="px-5 py-4">{invoice.subscriptionNumber}</td>
                <td className="px-5 py-4">
                  <InvoiceStatusBadge status={invoice.status} />
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {formatMoney(invoice.total)}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    className="rounded-md px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700"
                    onClick={() => onView(invoice)}
                    type="button"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td className="px-5 py-14 text-center" colSpan={6}>
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                      <FileText aria-hidden="true" size={22} />
                    </span>
                    <p className="font-medium text-slate-900">
                      No invoices available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Invoices generated from subscriptions will appear here
                      when backend billing is connected.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    value,
  );
}
