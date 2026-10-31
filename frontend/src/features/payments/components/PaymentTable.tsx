import { CreditCard } from "lucide-react";
import type { PaymentRecord } from "../types";

export function PaymentTable({ payments }: { payments: PaymentRecord[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-162.5 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3.5" scope="col">Invoice</th>
              <th className="px-5 py-3.5" scope="col">Method</th>
              <th className="px-5 py-3.5" scope="col">Date</th>
              <th className="px-5 py-3.5" scope="col">Note</th>
              <th className="px-5 py-3.5 text-right" scope="col">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment, index) => (
              <tr
                className="text-slate-700"
                key={`${payment.invoiceNumber}-${payment.date}-${index}`}
              >
                <th className="px-5 py-4 font-medium text-slate-900" scope="row">
                  {payment.invoiceNumber}
                </th>
                <td className="px-5 py-4">{payment.method}</td>
                <td className="px-5 py-4">{payment.date}</td>
                <td className="px-5 py-4">{payment.note || "—"}</td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {formatMoney(payment.amount)}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td className="px-5 py-14 text-center" colSpan={5}>
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                      <CreditCard aria-hidden="true" size={22} />
                    </span>
                    <p className="font-medium text-slate-900">
                      No payment records available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Payments will appear here when the payment API is
                      connected.
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
