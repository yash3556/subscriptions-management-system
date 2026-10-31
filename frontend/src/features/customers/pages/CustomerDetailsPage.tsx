import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";

const relations = [
  ["Quotations", "quotations"],
  ["Subscriptions", "subscriptions"],
  ["Invoices", "invoices"],
  ["Payments", "payments"],
] as const;

export function CustomerDetailsPage() {
  const { customerId = "" } = useParams();
  const [customer, setCustomer] = useState<BusinessRecord | null>(null);
  const [related, setRelated] = useState<Record<string, BusinessRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!customerId) { setLoading(false); setError("Customer ID is missing."); return; }
    setLoading(true); setError("");
    try {
      const [customerRecord, ...relatedLists] = await Promise.all([
        businessService.customers.get(customerId),
        ...relations.map(([, endpoint]) => businessService.customers[endpoint](customerId)),
      ]);
      setCustomer(customerRecord);
      setRelated(Object.fromEntries(relations.map(([label], index) => [label, relatedLists[index].items])));
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setLoading(false); }
  }, [customerId]);
  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <section aria-labelledby="customer-detail-title" className="mx-auto w-full max-w-5xl">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700" to="/app/customers"><ArrowLeft aria-hidden="true" size={17} />Back to customers</Link>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="customer-detail-title">Customer details</h1>
      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => void refresh()} type="button">Retry</button></p>}
      {loading ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading customer…</p> : customer && <>
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Contact and billing information</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Detail label="Name" value={String(customer.name ?? "")} /><Detail label="Email" value={String(customer.email ?? "")} /><Detail label="Phone" value={String(customer.phone ?? "")} /><Detail label="Billing address" value={typeof customer.billing_address === "object" && customer.billing_address !== null ? Object.values(customer.billing_address).filter(Boolean).join(", ") : ""} /></dl></section>
        <div className="mt-5 grid gap-5 md:grid-cols-2">{relations.map(([label]) => <section className="rounded-lg border border-slate-200 bg-white p-5" key={label}><h2 className="font-semibold text-slate-900">{label}</h2><ul className="mt-3 divide-y">{(related[label] ?? []).map((item) => <li className="flex items-center justify-between gap-3 py-3 text-sm" key={item.id}><span>{String(item.number ?? item.name ?? item.id)}</span><span className="text-slate-500">{String(item.status ?? item.method ?? "")}</span></li>)}{(related[label] ?? []).length === 0 && <li className="py-3 text-sm text-slate-500">No {label.toLocaleLowerCase()} found.</li>}</ul></section>)}</div>
      </>}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value || "Not provided"}</dd></div>;
}
