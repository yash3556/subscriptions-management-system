import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";
import { SubscriptionStatusBadge } from "../components/SubscriptionStatusBadge";

type LifecycleAction = "activate" | "pause" | "resume" | "renew" | "close";

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function SubscriptionDetailsPage() {
  const { user } = useAuth();
  const { subscriptionId = "" } = useParams();
  const [record, setRecord] = useState<BusinessRecord | null>(null);
  const [history, setHistory] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [startAt, setStartAt] = useState(new Date().toISOString().slice(0, 10));
  const [expiresAt, setExpiresAt] = useState("");
  const canWrite = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("subscriptions:write"));

  const refresh = useCallback(async () => {
    if (!subscriptionId) {
      setLoading(false);
      setError("Open a subscription from the list to view its details.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [details, events] = await Promise.all([
        businessService.subscriptions.get(subscriptionId),
        businessService.subscriptions.history(subscriptionId),
      ]);
      setRecord(details);
      setHistory(events);
      setExpiresAt(typeof details.expires_at === "string" ? details.expires_at.slice(0, 10) : "");
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function perform(action: LifecycleAction) {
    if (!record) return;
    if ((action === "close" || action === "renew") && !window.confirm(`${action === "close" ? "Close" : "Renew"} this subscription?`)) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const start = new Date(`${startAt}T00:00:00Z`).toISOString();
      const expiry = expiresAt ? new Date(`${expiresAt}T23:59:59Z`).toISOString() : null;
      if (expiry && new Date(expiry) <= new Date(start)) {
        setError("Expiry date must be after the start date.");
        return;
      }
      if (action === "activate") await businessService.subscriptions.activate(subscriptionId, { start_at: start, expires_at: expiry });
      if (action === "pause") await businessService.subscriptions.pause(subscriptionId);
      if (action === "resume") await businessService.subscriptions.resume(subscriptionId);
      if (action === "renew") await businessService.subscriptions.renew(subscriptionId, { start_at: start, expires_at: expiry });
      if (action === "close") await businessService.subscriptions.close(subscriptionId);
      setNotice(`Subscription ${action === "renew" ? "renewed" : `${action}d`}.`);
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setWorking(false);
    }
  }

  const status = typeof record?.status === "string" && ["draft", "quotation", "confirmed", "active", "paused", "closed", "expired"].includes(record.status)
    ? record.status as "draft" | "quotation" | "confirmed" | "active" | "paused" | "closed" | "expired"
    : "confirmed";
  const actions: LifecycleAction[] = status === "confirmed" ? ["activate"] : status === "active" ? ["pause", "close"] : status === "paused" ? ["resume", "close"] : ["closed", "expired"].includes(status) ? ["renew"] : [];
  const lines = Array.isArray(record?.lines) ? record.lines : [];

  return (
    <section aria-labelledby="subscription-detail-title" className="mx-auto w-full max-w-5xl">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700" to="/app/subscriptions"><ArrowLeft aria-hidden="true" size={17} />Back to subscriptions</Link>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="subscription-detail-title">Subscription details</h1>{record && <p className="mt-1 text-sm text-slate-600">{String(record.number ?? record.id)}</p>}</div>{record && <SubscriptionStatusBadge status={status} />}</div>
      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => void refresh()} type="button">Retry</button></p>}
      {notice && <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{notice}</p>}
      {loading ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading subscription…</p> : record && <div className="mt-5 space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Terms and billing</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Detail label="Customer" value={String(record.customer_name ?? record.customer_id ?? "—")} /><Detail label="Status" value={status} /><Detail label="Start date" value={formatDate(record.start_at)} /><Detail label="Expiry date" value={formatDate(record.expires_at)} /><Detail label="Next billing date" value={formatDate(record.next_billing_at)} /></dl></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Subscription items</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-120 text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Item</th><th className="py-2 text-right">Quantity</th><th className="py-2 text-right">Unit price</th><th className="py-2 text-right">Total</th></tr></thead><tbody className="divide-y">{lines.map((raw, index) => { const line = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {}; return <tr key={String(line.id ?? index)}><td className="py-3">{String(line.product_name ?? line.plan_name ?? "Item")}</td><td className="py-3 text-right">{String(line.quantity ?? "—")}</td><td className="py-3 text-right">{(Number(line.unit_price_paise ?? 0) / 100).toFixed(2)}</td><td className="py-3 text-right">{(Number(line.total_paise ?? 0) / 100).toFixed(2)}</td></tr>; })}{!lines.length && <tr><td className="py-5 text-center text-slate-500" colSpan={4}>No subscription items.</td></tr>}</tbody></table></div></section>
        {canWrite && actions.length > 0 && <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Lifecycle actions</h2><div className="mt-3 flex flex-wrap items-end gap-3">{actions.some((action) => action === "activate" || action === "renew") && <><label className="text-sm"><span className="mb-1 block">Start date</span><input className="rounded-md border border-slate-300 px-3 py-2" onChange={(event) => setStartAt(event.target.value)} type="date" value={startAt} /></label><label className="text-sm"><span className="mb-1 block">Expiry date (optional)</span><input className="rounded-md border border-slate-300 px-3 py-2" min={startAt} onChange={(event) => setExpiresAt(event.target.value)} type="date" value={expiresAt} /></label></>}{actions.map((action) => <button className={`rounded-md px-4 py-2 text-sm font-medium ${action === "close" ? "border border-red-300 text-red-700" : "bg-blue-700 text-white"} disabled:opacity-50`} disabled={working} key={action} onClick={() => void perform(action)} type="button">{working ? "Working…" : `${action[0].toUpperCase()}${action.slice(1)}`}</button>)}</div></section>}
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">History</h2><ol className="mt-3 space-y-3">{history.map((event) => <li className="border-l-2 border-slate-200 pl-3 text-sm" key={event.id}><p className="font-medium text-slate-800">{String(event.action ?? event.event_type ?? "Lifecycle event")}</p><p className="text-slate-500">{formatDate(event.created_at ?? event.occurred_at)}</p></li>)}{history.length === 0 && <li className="text-sm text-slate-500">No history events.</li>}</ol></section>
      </div>}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value}</dd></div>;
}
