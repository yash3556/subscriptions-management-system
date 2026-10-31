import { useCallback, useEffect, useState } from "react";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";

export function PortalQuotationsPage() {
  const [quotes, setQuotes] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await businessService.quotations.list();
      setQuotes(result.items);
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function respond(id: string, accepted: boolean) {
    setBusy(id);
    setError("");
    setNotice("");
    try {
      if (accepted) await businessService.quotations.accept(id);
      else await businessService.quotations.reject(id);
      setNotice(accepted ? "Quotation accepted." : "Quotation declined.");
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setBusy("");
    }
  }
  return (
    <section aria-labelledby="portal-quotations-title" className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="portal-quotations-title">My Quotations</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">Review quotation details and respond to open offers.</p>
      {(error || notice) && <p className={`mt-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
      {loading ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading quotations…</p> : (
        <div className="mt-5 space-y-4">{quotes.map((quote) => {
          const canRespond = quote.status === "quotation" && !quote.customer_accepted_at;
          const lines = Array.isArray(quote.lines) ? quote.lines : [];
          return <article className="rounded-lg border border-slate-200 bg-white p-5" key={quote.id}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{String(quote.number ?? quote.id)}</h2><p className="mt-1 text-sm text-slate-500">Valid until {typeof quote.valid_until === "string" ? new Date(quote.valid_until).toLocaleDateString() : "—"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">{String(quote.status ?? "quotation")}</span></div>
            <ul className="mt-4 divide-y divide-slate-100 text-sm">{lines.map((raw, index) => {
              const line = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
              return <li className="flex justify-between gap-4 py-2" key={`${index}-${String(line.product_id ?? line.plan_id ?? "")}`}><span>{String(line.product_name ?? line.plan_name ?? "Item")} × {String(line.quantity ?? 0)}</span><span>{formatMoney(Number(line.total_paise ?? 0))}</span></li>;
            })}</ul>
            <p className="mt-3 text-right text-sm font-semibold text-slate-900">Total: {formatMoney(Number(quote.total_paise ?? 0))}</p>
            {canRespond && <div className="mt-4 flex justify-end gap-2"><button className="rounded-md border border-slate-300 px-3 py-2 text-sm" disabled={busy === quote.id} onClick={() => void respond(quote.id, false)} type="button">Reject</button><button className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy === quote.id} onClick={() => void respond(quote.id, true)} type="button">{busy === quote.id ? "Saving…" : "Accept"}</button></div>}
          </article>;
        })}{quotes.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No quotations are associated with your account.</p>}</div>
      )}
    </section>
  );
}

function formatMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}
