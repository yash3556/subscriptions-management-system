import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";

const methods = ["cash", "bank_transfer", "upi", "card", "other"] as const;
const money = (paise: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(paise / 100);

export function PaymentsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const state = location.state as { invoiceId?: unknown } | null;
  const [payments, setPayments] = useState<BusinessRecord[]>([]);
  const [invoices, setInvoices] = useState<BusinessRecord[]>([]);
  const [invoiceId, setInvoiceId] = useState(typeof state?.invoiceId === "string" ? state.invoiceId : "");
  const [method, setMethod] = useState<(typeof methods)[number]>("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const keyRef = useRef(crypto.randomUUID());
  const canWrite = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("payments:write"));
  const canReadInvoices = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("invoices:read"));
  const selectedInvoice = useMemo(() => invoices.find((invoice) => invoice.id === invoiceId), [invoices, invoiceId]);
  const outstanding = Number(selectedInvoice?.outstanding_paise ?? 0);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [paymentRows, invoiceRows] = await Promise.all([
        businessService.payments.list(),
        canReadInvoices ? businessService.invoices.list() : Promise.resolve({ items: [] as BusinessRecord[], page: 1, page_size: 100 }),
      ]);
      setPayments(paymentRows.items);
      setInvoices(invoiceRows.items);
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setLoading(false); }
  }, [canReadInvoices]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountPaise = Math.round(Number(amount) * 100);
    if (!invoiceId || amountPaise <= 0 || !Number.isSafeInteger(amountPaise)) {
      setError("Select an invoice and enter a valid payment amount.");
      return;
    }
    if (amountPaise > outstanding) {
      setError("Payment amount exceeds the invoice's outstanding balance.");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      await businessService.payments.create({
        invoice_id: invoiceId,
        amount_paise: amountPaise,
        method,
        reference: reference.trim() || null,
        note: note.trim() || null,
      }, keyRef.current);
      keyRef.current = crypto.randomUUID();
      setNotice("Payment recorded and invoice balance refreshed.");
      setAmount(""); setReference(""); setNote("");
      await refresh();
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setSaving(false); }
  }

  return (
    <section aria-labelledby="payments-title" className="mx-auto w-full max-w-7xl">
      <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="payments-title">Payments</h1><p className="mt-1 text-sm leading-6 text-slate-600">Record partial or full invoice payments and review payment history.</p></div>
      {(error || notice) && <p className={`mt-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>{error || notice}<button className="ml-3 underline" onClick={() => void refresh()} type="button">Refresh</button></p>}
      {canWrite && canReadInvoices && <form className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => void submit(event)}>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-1">Invoice<select className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal" onChange={(event) => setInvoiceId(event.target.value)} required value={invoiceId}><option value="">Select an outstanding invoice</option>{invoices.filter((invoice) => Number(invoice.outstanding_paise ?? 0) > 0).map((invoice) => <option key={invoice.id} value={invoice.id}>{String(invoice.number ?? invoice.id)} · balance {money(Number(invoice.outstanding_paise))}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Method<select className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal" onChange={(event) => setMethod(event.target.value as (typeof methods)[number])} value={method}>{methods.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Amount (INR)<input className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal" min="0.01" max={outstanding / 100} onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} /></label>
        <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700"><span className="block text-xs uppercase text-slate-500">Outstanding balance</span><strong>{selectedInvoice ? money(outstanding) : "Select invoice"}</strong></div>
        <label className="text-sm font-medium text-slate-700">Reference<input className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal" maxLength={160} onChange={(event) => setReference(event.target.value)} value={reference} /></label>
        <label className="text-sm font-medium text-slate-700">Notes<input className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal" maxLength={1000} onChange={(event) => setNote(event.target.value)} value={note} /></label>
        <div className="sm:col-span-2 lg:col-span-3"><button className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving || !invoiceId || Number(amount) <= 0} type="submit">{saving ? "Recording…" : "Record payment"}</button></div>
      </form>}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white"><h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">Payment history</h2>{loading ? <p className="p-8 text-center text-sm text-slate-600">Loading payments…</p> : <div className="overflow-x-auto"><table className="w-full min-w-160 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Reference / note</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y">{payments.map((payment) => { const invoice = invoices.find((item) => item.id === payment.invoice_id); return       <tr key={payment.id}><td className="px-5 py-4">{String(invoice?.number ?? payment.invoice_id ?? "—")}</td><td className="px-5 py-4">{String(payment.method ?? "—")}</td><td className="px-5 py-4">{typeof payment.recorded_at === "string" ? new Date(payment.recorded_at).toLocaleDateString() : "—"}</td><td className="px-5 py-4">{String(payment.reference ?? payment.note ?? "—")}</td><td className="px-5 py-4 text-right">{money(Number(payment.amount_paise ?? 0))}</td></tr>; })}{payments.length === 0 && <tr><td className="px-5 py-10 text-center text-slate-500" colSpan={5}>No payments recorded.</td></tr>}</tbody></table></div>}</section>
    </section>
  );
}
