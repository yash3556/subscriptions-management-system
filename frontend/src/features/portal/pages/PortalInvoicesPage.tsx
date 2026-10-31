import { useEffect, useState } from "react";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);

export function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<BusinessRecord[]>([]);
  const [payments, setPayments] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const customer = await businessService.customers.me();
        const [invoiceRows, paymentRows] = await Promise.all([
          businessService.customers.invoices(customer.id),
          businessService.customers.payments(customer.id),
        ]);
        if (active) {
          setInvoices(invoiceRows.items);
          setPayments(paymentRows.items);
        }
      } catch (reason) {
        if (active) setError(getBusinessErrorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);
  const invoiceNumbers = new Map(invoices.map((invoice) => [invoice.id, String(invoice.number ?? invoice.id)]));
  return (
    <section aria-labelledby="portal-invoices-title" className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="portal-invoices-title">My Invoices & Payments</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">Invoice balances and recorded payment history associated with your account.</p>
      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      {loading ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading invoices…</p> : (
        <>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-180 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Due date</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3 text-right">Paid</th><th className="px-5 py-3 text-right">Outstanding</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{invoices.map((invoice) => (
              <tr key={invoice.id}><th className="px-5 py-4 font-medium text-slate-900">{String(invoice.number ?? invoice.id)}</th><td className="px-5 py-4 capitalize">{String(invoice.status ?? "—")}</td><td className="px-5 py-4">{date(invoice.due_at)}</td><td className="px-5 py-4 text-right">{money(Number(invoice.total_paise ?? 0))}</td><td className="px-5 py-4 text-right">{money(Number(invoice.amount_paid_paise ?? 0))}</td><td className="px-5 py-4 text-right font-medium">{money(Number(invoice.outstanding_paise ?? 0))}</td></tr>
            ))}{invoices.length === 0 && <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={6}>No invoices are associated with your account.</td></tr>}</tbody>
          </table></div></div>
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Payment history</h2>
            {payments.length ? <div className="mt-3 divide-y divide-slate-100">{payments.map((payment) => (
              <div className="flex flex-wrap justify-between gap-2 py-3 text-sm" key={payment.id}><span>{invoiceNumbers.get(String(payment.invoice_id)) ?? "Invoice"} · {String(payment.method ?? "—")}</span><span className="font-medium">{money(Number(payment.amount_paise ?? 0))}</span><span className="text-slate-500">{date(payment.recorded_at)}</span></div>
            ))}</div> : <p className="mt-3 text-sm text-slate-500">No recorded payments.</p>}
          </section>
        </>
      )}
    </section>
  );
}

function date(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleDateString() : "—";
}
