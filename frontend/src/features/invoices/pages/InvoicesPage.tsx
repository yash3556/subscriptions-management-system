import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";
import { InvoiceTable } from "../components/InvoiceTable";
import type { InvoiceRecord, InvoiceStatus } from "../types";

const statuses: InvoiceStatus[] = ["draft", "confirmed", "paid", "cancelled"];

function mapInvoice(record: BusinessRecord, customers: BusinessRecord[], subscriptions: BusinessRecord[]): InvoiceRecord {
  const customerId = typeof record.customer_id === "string" ? record.customer_id : "";
  const subscriptionId = typeof record.subscription_id === "string" ? record.subscription_id : "";
  const customer = customers.find((item) => item.id === customerId);
  const subscription = subscriptions.find((item) => item.id === subscriptionId);
  const lines = Array.isArray(record.lines) ? record.lines : [];
  return {
    id: record.id,
    number: String(record.number ?? record.id),
    customer: String(customer?.name ?? customerId),
    subscriptionNumber: String(subscription?.number ?? subscriptionId),
    status: statuses.includes(record.status as InvoiceStatus) ? record.status as InvoiceStatus : "draft",
    dueDate: typeof record.due_at === "string" ? record.due_at : "",
    subtotal: Number(record.subtotal_paise ?? 0) / 100,
    tax: Number(record.tax_paise ?? 0) / 100,
    discount: Number(record.discount_paise ?? 0) / 100,
    total: Number(record.total_paise ?? 0) / 100,
    amountPaid: Number(record.amount_paid_paise ?? 0) / 100,
    outstanding: Number(record.outstanding_paise ?? 0) / 100,
    lines: lines.flatMap((raw) => {
      if (typeof raw !== "object" || raw === null) return [];
      const line = raw as Record<string, unknown>;
      return [{
        product: String(line.product_name ?? line.plan_name ?? "Item"),
        quantity: Number(line.quantity ?? 0),
        unitPrice: Number(line.unit_price_paise ?? 0) / 100,
        taxes: `${Number(line.tax_rate_bps ?? 0) / 100}%`,
        amount: Number(line.total_paise ?? 0) / 100,
      }];
    }),
  };
}

export function InvoicesPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [customers, setCustomers] = useState<BusinessRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<BusinessRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [generateFrom, setGenerateFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const canWrite = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("invoices:write"));
  const canReadCustomers = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("customers:read"));
  const canReadSubscriptions = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("subscriptions:read"));
  const canGenerate = canWrite && canReadSubscriptions;
  const invoices = useMemo(() => records.map((row) => mapInvoice(row, customers, subscriptions)).filter((invoice) => {
    const query = search.trim().toLocaleLowerCase();
    return (!query || `${invoice.number} ${invoice.customer} ${invoice.subscriptionNumber}`.toLocaleLowerCase().includes(query)) && (!status || invoice.status === status);
  }), [customers, records, search, status, subscriptions]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [invoiceRows, subscriptionRows, customerRows] = await Promise.all([
        businessService.invoices.list(search, status || undefined),
        canReadSubscriptions ? businessService.subscriptions.list() : Promise.resolve({ items: [] as BusinessRecord[], page: 1, page_size: 100 }),
        canReadCustomers ? businessService.customers.list() : Promise.resolve({ items: [] as BusinessRecord[], page: 1, page_size: 100 }),
      ]);
      setRecords(invoiceRows.items);
      setSubscriptions(subscriptionRows.items);
      setCustomers(customerRows.items);
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setLoading(false); }
  }, [canReadCustomers, canReadSubscriptions, search, status]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function generateInvoice() {
    if (!generateFrom) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await businessService.invoices.generate(generateFrom);
      setNotice("Invoice generated from subscription.");
      setGenerateFrom("");
      await refresh();
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="invoices-title" className="mx-auto w-full max-w-7xl">
      <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="invoices-title">Invoices</h1><p className="mt-1 text-sm leading-6 text-slate-600">View billing records, balances, and payments.</p></div>
      {canGenerate && <div className="mt-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"><label className="block flex-1"><span className="mb-1.5 block text-sm font-medium text-slate-700">Generate from subscription</span><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => setGenerateFrom(event.target.value)} value={generateFrom}><option value="">Select active subscription</option>{subscriptions.filter((sub) => sub.status === "active").map((sub) => <option key={sub.id} value={sub.id}>{String(sub.number ?? sub.id)}</option>)}</select></label><button className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={!generateFrom || busy} onClick={() => void generateInvoice()} type="button">{busy ? "Generating…" : "Generate invoice"}</button></div>}
      {(error || notice) && <p className={`mt-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>{error || notice}{error && <button className="ml-3 underline" onClick={() => void refresh()} type="button">Retry</button>}</p>}
      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"><label className="block w-full sm:max-w-sm"><span className="mb-1.5 block text-sm font-medium text-slate-700">Search invoices</span><input className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" onChange={(event) => setSearch(event.target.value)} value={search} /></label><label className="block w-full sm:max-w-xs"><span className="mb-1.5 block text-sm font-medium text-slate-700">Invoice status</span><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => setStatus(event.target.value as InvoiceStatus | "")} value={status}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
      <div className="mt-4">{loading ? <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading invoices…</p> : <InvoiceTable invoices={invoices} onView={(invoice) => navigate(`/app/invoices/details/${invoice.id}`)} />}</div>
    </section>
  );
}
