import { useState } from "react";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import type { InvoiceRecord } from "../types";

interface InvoiceDetailsProps {
  invoice?: InvoiceRecord;
}

const actions = ["Confirm", "Cancel", "Send", "Print"] as const;

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
    value,
  );
}

export function InvoiceDetails({ invoice }: InvoiceDetailsProps) {
  const [notice, setNotice] = useState("");

  if (!invoice) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Invoice details unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Invoice records will be available when backend billing is connected.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Invoice
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {invoice.number}
            </h2>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <Detail label="Customer" value={invoice.customer} />
          <Detail label="Subscription" value={invoice.subscriptionNumber} />
          <Detail label="Due date" value={invoice.dueDate || "—"} />
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900">Invoice lines</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-155 text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 pr-4" scope="col">Product</th>
                <th className="pb-2 pr-4 text-right" scope="col">Quantity</th>
                <th className="pb-2 pr-4 text-right" scope="col">Unit price</th>
                <th className="pb-2 pr-4" scope="col">Taxes</th>
                <th className="pb-2 text-right" scope="col">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lines.map((line, index) => (
                <tr key={`${line.product}-${index}`}>
                  <td className="py-3 pr-4 text-slate-700">{line.product}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-700">
                    {line.quantity}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-700">
                    {formatMoney(line.unitPrice)}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{line.taxes || "—"}</td>
                  <td className="py-3 text-right tabular-nums text-slate-900">
                    {formatMoney(line.amount)}
                  </td>
                </tr>
              ))}
              {invoice.lines.length === 0 && (
                <tr>
                  <td className="py-5 text-center text-slate-500" colSpan={5}>
                    No invoice lines.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto mt-5 grid max-w-sm grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Detail label="Subtotal" value={formatMoney(invoice.subtotal)} />
          <Detail label="Tax" value={formatMoney(invoice.tax)} />
          <Detail label="Discount" value={formatMoney(invoice.discount)} />
          <Detail label="Total" value={formatMoney(invoice.total)} emphasized />
          <Detail label="Amount paid" value={formatMoney(invoice.amountPaid)} />
          <Detail label="Outstanding" value={formatMoney(invoice.outstanding)} emphasized />
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900">Invoice actions</h2>
        <p className="mt-1 text-sm text-slate-600">
          Actions require backend integration and are not performed here.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              key={action}
              onClick={() => setNotice(`${action} is not connected. No action was performed.`)}
              type="button"
            >
              {action}
            </button>
          ))}
        </div>
        {notice && (
          <p className="mt-3 text-sm text-amber-800" role="status">
            {notice}
          </p>
        )}
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <>
      <dt className={emphasized ? "font-semibold text-slate-900" : "text-slate-600"}>
        {label}
      </dt>
      <dd
        className={`text-right tabular-nums ${
          emphasized ? "font-semibold text-slate-900" : "text-slate-800"
        }`}
      >
        {value}
      </dd>
    </>
  );
}
