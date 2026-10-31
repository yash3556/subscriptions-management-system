import { Repeat } from "lucide-react";
import type { SubscriptionRecord } from "../types";
import { SubscriptionStatusBadge } from "./SubscriptionStatusBadge";

interface SubscriptionTableProps {
  subscriptions: SubscriptionRecord[];
  onView: (subscription: SubscriptionRecord) => void;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

export function SubscriptionTable({
  subscriptions,
  onView,
}: SubscriptionTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3.5" scope="col">
                Subscription number
              </th>
              <th className="px-5 py-3.5" scope="col">
                Customer
              </th>
              <th className="px-5 py-3.5" scope="col">
                Plan
              </th>
              <th className="px-5 py-3.5" scope="col">
                Start date
              </th>
              <th className="px-5 py-3.5" scope="col">
                Expiry date
              </th>
              <th className="px-5 py-3.5" scope="col">
                Status
              </th>
              <th className="px-5 py-3.5" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.map((subscription) => (
              <tr className="text-slate-700" key={subscription.number}>
                <th
                  className="whitespace-nowrap px-5 py-4 font-medium text-slate-900"
                  scope="row"
                >
                  {subscription.number}
                </th>
                <td className="whitespace-nowrap px-5 py-4">
                  {subscription.customer}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {subscription.plan}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(subscription.startDate)}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(subscription.expiryDate)}
                </td>
                <td className="px-5 py-4">
                  <SubscriptionStatusBadge status={subscription.status} />
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    className="rounded-md px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700"
                    onClick={() => onView(subscription)}
                    type="button"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {subscriptions.length === 0 && (
              <tr>
                <td className="px-5 py-14 text-center" colSpan={7}>
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                      <Repeat aria-hidden="true" size={22} />
                    </span>
                    <p className="font-medium text-slate-900">
                      No subscriptions available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Subscription records will appear here when the backend is
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
