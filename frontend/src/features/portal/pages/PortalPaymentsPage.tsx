import { useEffect, useState } from "react";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";

const money = (paise: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(paise / 100);

export function PortalPaymentsPage() {
  const [payments, setPayments] = useState<BusinessRecord[]>([]);
  const [invoices, setInvoices] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const customer = await businessService.customers.me();
        const [paymentRows, invoiceRows] = await Promise.all([
          businessService.customers.payments(customer.id),
          businessService.customers.invoices(customer.id),
        ]);
        if (active) {
          setPayments(paymentRows.items);
          setInvoices(invoiceRows.items);
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
  return (
    <section aria-labelledby="portal-payments-title" className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="portal-payments-title">My Payments</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">Recorded payment activity associated with your invoices.</p>
      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      {loading ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading payments…</p> : (
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-150 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Recorded</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3 text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{payments.map((payment) => {
            const invoice = invoices.find((item) => item.id === payment.invoice_id);
            return <tr key={payment.id}><td className="px-5 py-4">{String(invoice?.number ?? payment.invoice_id ?? "—")}</td><td className="px-5 py-4">{date(payment.recorded_at)}</td><td className="px-5 py-4 capitalize">{String(payment.method ?? "—").replace("_", " ")}</td><td className="px-5 py-4">{String(payment.reference ?? payment.note ?? "—")}</td><td className="px-5 py-4 text-right font-medium">{money(Number(payment.amount_paise ?? 0))}</td></tr>;
          })}{payments.length === 0 && <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={5}>No recorded payments are associated with your account.</td></tr>}</tbody>
        </table></div></div>
      )}
    </section>
  );
}

function date(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleDateString() : "—";
}
