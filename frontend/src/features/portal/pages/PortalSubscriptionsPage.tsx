import { useEffect, useState } from "react";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";

export function PortalSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const customer = await businessService.customers.me();
        const result = await businessService.customers.subscriptions(customer.id);
        if (active) setSubscriptions(result.items);
      } catch (reason) {
        if (active) setError(getBusinessErrorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);
  return (
    <section aria-labelledby="portal-subscriptions-title" className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="portal-subscriptions-title">My Subscriptions</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">Subscription details associated with your account.</p>
      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      {loading ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading subscriptions…</p> : (
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto"><table className="w-full min-w-170 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Subscription</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Start date</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">Next billing</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{subscriptions.map((subscription) => (
              <tr key={subscription.id}><th className="px-5 py-4 font-medium text-slate-900">{String(subscription.number ?? subscription.id)}</th><td className="px-5 py-4 capitalize">{String(subscription.status ?? "—")}</td><td className="px-5 py-4">{formatDate(subscription.start_at)}</td><td className="px-5 py-4">{formatDate(subscription.expires_at)}</td><td className="px-5 py-4">{formatDate(subscription.next_billing_at)}</td></tr>
            ))}{subscriptions.length === 0 && <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={5}>No subscription records are associated with your account.</td></tr>}</tbody>
          </table></div>
        </div>
      )}
      <p className="mt-4 text-sm text-slate-500">Subscription lifecycle changes are managed by your account team.</p>
    </section>
  );
}

function formatDate(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleDateString() : "—";
}
