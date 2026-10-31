import type { SubscriptionRecord } from "../types";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";

const lifecycle = ["Draft", "Quotation", "Confirmed", "Active", "Closed"] as const;

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

export function SubscriptionDetails({
  subscription,
}: {
  subscription?: SubscriptionRecord;
}) {
  if (!subscription) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Subscription details unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Subscription records will be available when the backend is connected.
        </p>
      </section>
    );
  }

  const activeIndex = lifecycle.indexOf(subscription.status);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Subscription number
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {subscription.number}
            </h2>
          </div>
          <SubscriptionStatusBadge status={subscription.status} />
        </div>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <Detail label="Customer" value={subscription.customer} />
          <Detail label="Plan" value={subscription.plan} />
          <Detail label="Start date" value={formatDate(subscription.startDate)} />
          <Detail label="Expiry date" value={formatDate(subscription.expiryDate)} />
          <Detail label="Payment terms" value={subscription.paymentTerms} />
        </dl>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900">Lifecycle</h2>
        <ol className="mt-4 flex flex-wrap gap-2">
          {lifecycle.map((status, index) => (
            <li
              aria-current={status === subscription.status ? "step" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                index <= activeIndex
                  ? "bg-blue-50 text-blue-800"
                  : "bg-slate-100 text-slate-500"
              }`}
              key={status}
            >
              {status}
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900">Subscription lines</h2>
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
              {subscription.lines.map((line, index) => (
                <tr key={`${line.product}-${index}`}>
                  <td className="py-3 pr-4 text-slate-700">{line.product}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-700">
                    {line.quantity}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-700">
                    {formatPrice(line.unitPrice)}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{line.taxes || "—"}</td>
                  <td className="py-3 text-right tabular-nums text-slate-900">
                    {formatPrice(line.amount)}
                  </td>
                </tr>
              ))}
              {subscription.lines.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-slate-500" colSpan={5}>
                    No subscription lines.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-900">{value || "—"}</dd>
    </div>
  );
}
