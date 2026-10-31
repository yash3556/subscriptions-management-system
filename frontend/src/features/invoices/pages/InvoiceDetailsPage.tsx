import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";
import { InvoiceStatusBadge } from "../components/InvoiceStatusBadge";
import type { InvoiceStatus } from "../types";

const invoiceStatuses: InvoiceStatus[] = ["draft", "confirmed", "paid", "cancelled"];
const money = (paise: unknown) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(Number(paise ?? 0) / 100);

export function InvoiceDetailsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invoiceId = "" } = useParams();
  const [invoice, setInvoice] = useState<BusinessRecord | null>(null);
  const [payments, setPayments] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canWrite = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("invoices:write"));
  const canReadPayments = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("payments:read"));
  const canWritePayments = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("payments:write"));

  const refresh = useCallback(async () => {
    if (!invoiceId) { setLoading(false); setError("Open an invoice from the list to view its details."); return; }
    setLoading(true); setError("");
    try {
      const [details, paymentRows] = await Promise.all([
        businessService.invoices.get(invoiceId),
        canReadPayments ? businessService.payments.forInvoice(invoiceId) : Promise.resolve([] as BusinessRecord[]),
      ]);
      setInvoice(details);
      setPayments(paymentRows);
      setDueAt(typeof details.due_at === "string" ? details.due_at.slice(0, 10) : "");
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setLoading(false); }
  }, [canReadPayments, invoiceId]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function perform(action: "confirm" | "cancel") {
    if (action === "cancel" && !window.confirm("Cancel this invoice?")) return;
    setWorking(true); setError(""); setNotice("");
    try {
      if (action === "confirm") await businessService.invoices.confirm(invoiceId, dueAt ? { due_at: new Date(`${dueAt}T00:00:00Z`).toISOString() } : {});
      else await businessService.invoices.cancel(invoiceId);
      setNotice(action === "confirm" ? "Invoice confirmed." : "Invoice cancelled.");
      await refresh();
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setWorking(false); }
  }

  const status = invoiceStatuses.includes(invoice?.status as InvoiceStatus) ? invoice?.status as InvoiceStatus : "draft";
  const lines = Array.isArray(invoice?.lines) ? invoice.lines : [];
  return (
    <section aria-labelledby="invoice-detail-title" className="mx-auto w-full max-w-5xl">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700" to="/app/invoices"><ArrowLeft aria-hidden="true" size={17} />Back to invoices</Link>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="invoice-detail-title">Invoice details</h1>{invoice && <p className="mt-1 text-sm text-slate-600">{String(invoice.number ?? invoice.id)}</p>}</div>{invoice && <InvoiceStatusBadge status={status} />}</div>
      {(error || notice) && <p className={`mt-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>{error || notice}{error && <button className="ml-3 underline" onClick={() => void refresh()} type="button">Retry</button>}</p>}
      {loading ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading invoice…</p> : invoice && <div className="mt-5 space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Invoice summary</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Detail label="Customer" value={String(invoice.customer_name ?? invoice.customer_id ?? "—")} /><Detail label="Subscription" value={String(invoice.subscription_number ?? invoice.subscription_id ?? "—")} /><Detail label="Due date" value={typeof invoice.due_at === "string" ? new Date(invoice.due_at).toLocaleDateString() : "—"} /><Detail label="Subtotal" value={money(invoice.subtotal_paise)} /><Detail label="Discount" value={money(invoice.discount_paise)} /><Detail label="Tax" value={money(invoice.tax_paise)} /><Detail label="Total" value={money(invoice.total_paise)} /><Detail label="Amount paid" value={money(invoice.amount_paid_paise)} /><Detail label="Outstanding" value={money(invoice.outstanding_paise)} /></dl></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Invoice lines</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-120 text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Item</th><th className="py-2 text-right">Quantity</th><th className="py-2 text-right">Unit price</th><th className="py-2 text-right">Total</th></tr></thead><tbody className="divide-y">{lines.map((raw, index) => { const line = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {}; return <tr key={String(line.id ?? index)}><td className="py-3">{String(line.product_name ?? line.plan_name ?? "Item")}</td><td className="py-3 text-right">{String(line.quantity ?? "—")}</td><td className="py-3 text-right">{money(line.unit_price_paise)}</td><td className="py-3 text-right">{money(line.total_paise)}</td></tr>; })}{!lines.length && <tr><td className="py-5 text-center text-slate-500" colSpan={4}>No invoice lines.</td></tr>}</tbody></table></div></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">Payment history</h2>{canWritePayments && <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-blue-700" onClick={() => navigate("/app/payments", { state: { invoiceId } })} type="button">Record payment</button>}</div>{canReadPayments ? <ul className="mt-3 divide-y">{payments.map((payment) => <li className="flex justify-between gap-4 py-3 text-sm" key={payment.id}><span>{String(payment.method ?? "Payment")} · {String(payment.reference ?? payment.note ?? "—")}</span><strong>{money(payment.amount_paise)}</strong></li>)}{payments.length === 0 && <li className="py-4 text-sm text-slate-500">No payments recorded.</li>}</ul> : <p className="mt-3 text-sm text-slate-500">Payment history requires payments:read permission.</p>}</section>
        <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Actions</h2><p className="mt-1 text-sm text-slate-600">Print is available. The backend does not currently provide invoice PDF downloads or email delivery.</p><div className="mt-4 flex flex-wrap items-end gap-3"><button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium" onClick={() => window.print()} type="button">Print invoice</button>{canWrite && status === "draft" && <><label className="text-sm"><span className="mb-1 block">Due date</span><input className="rounded-md border border-slate-300 px-3 py-2" onChange={(event) => setDueAt(event.target.value)} type="date" value={dueAt} /></label><button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={working} onClick={() => void perform("confirm")} type="button">{working ? "Working…" : "Confirm"}</button></>}{canWrite && status === "confirmed" && <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50" disabled={working} onClick={() => void perform("cancel")} type="button">Cancel invoice</button>}</div></section>
      </div>}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value}</dd></div>;
}
