import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SubscriptionDialog } from "../components/SubscriptionDialog";
import { SubscriptionSearch } from "../components/SubscriptionSearch";
import { SubscriptionTable } from "../components/SubscriptionTable";
import type {
  SubscriptionFormValues,
  SubscriptionRecord,
  SubscriptionStatus,
} from "../types";

const subscriptions: SubscriptionRecord[] = [];
const statuses: SubscriptionStatus[] = [
  "Draft",
  "Quotation",
  "Confirmed",
  "Active",
  "Closed",
];

export function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return subscriptions.filter((subscription) => {
      const matchesSearch =
        !query ||
        [subscription.number, subscription.customer, subscription.plan]
          .some((value) => value.toLocaleLowerCase().includes(query));
      return matchesSearch && (!status || subscription.status === status);
    });
  }, [search, status]);

  function handleSubmit(_values: SubscriptionFormValues) {
    setNotice(
      "Subscription saving is unavailable until backend integration. No subscription was saved.",
    );
  }

  return (
    <section
      aria-labelledby="subscriptions-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-slate-900"
            id="subscriptions-title"
          >
            Subscriptions
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Review subscription terms, lines, and lifecycle progress.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          onClick={() => {
            setNotice("");
            setDialogOpen(true);
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Create subscription
        </button>
      </div>
      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <SubscriptionSearch onChange={setSearch} value={search} />
        <label className="block w-full sm:max-w-xs">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Lifecycle status
          </span>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            onChange={(event) =>
              setStatus(event.target.value as SubscriptionStatus | "")
            }
            value={status}
          >
            <option value="">All statuses</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      {notice && (
        <p
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
          role="status"
        >
          {notice}
        </p>
      )}
      <div className="mt-4">
        <SubscriptionTable
          onView={(subscription) =>
            navigate("/app/subscriptions/details", { state: subscription })
          }
          subscriptions={filtered}
        />
      </div>
      {dialogOpen && (
        <SubscriptionDialog
          notice={notice}
          onClose={() => {
            setDialogOpen(false);
            setNotice("");
          }}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}
