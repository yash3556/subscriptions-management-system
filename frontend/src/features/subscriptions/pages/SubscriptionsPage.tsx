import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";
import { SubscriptionSearch } from "../components/SubscriptionSearch";
import { SubscriptionTable } from "../components/SubscriptionTable";
import type { SubscriptionRecord, SubscriptionStatus } from "../types";

const statuses: SubscriptionStatus[] = ["confirmed", "active", "paused", "closed", "expired"];

function mapSubscription(record: BusinessRecord, customers: BusinessRecord[]): SubscriptionRecord {
  const customerId = typeof record.customer_id === "string" ? record.customer_id : "";
  const customer = customers.find((item) => item.id === customerId);
  const lines = Array.isArray(record.lines) ? record.lines : [];
  const firstLine = typeof lines[0] === "object" && lines[0] !== null ? lines[0] as Record<string, unknown> : {};
  const status = statuses.includes(record.status as SubscriptionStatus) ? record.status as SubscriptionStatus : "confirmed";
  return {
    id: record.id,
    number: typeof record.number === "string" ? record.number : record.id,
    customer: typeof customer?.name === "string" ? customer.name : customerId,
    plan: typeof firstLine.plan_name === "string" ? firstLine.plan_name : lines.map((line) => typeof line === "object" && line !== null ? String((line as Record<string, unknown>).product_name ?? "") : "").filter(Boolean).join(", "),
    startDate: typeof record.start_at === "string" ? record.start_at : "",
    expiryDate: typeof record.expires_at === "string" ? record.expires_at : "",
    nextBillingDate: typeof record.next_billing_at === "string" ? record.next_billing_at : "",
    paymentTerms: "",
    status,
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

export function SubscriptionsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [customers, setCustomers] = useState<BusinessRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const canReadCustomers = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("customers:read"));
  const subscriptions = useMemo(() => records.map((record) => mapSubscription(record, customers)).filter((item) => {
    const query = search.trim().toLocaleLowerCase();
    return (!query || `${item.number} ${item.customer} ${item.plan}`.toLocaleLowerCase().includes(query)) && (!status || item.status === status);
  }), [customers, records, search, status]);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, customerRows] = await Promise.all([
        businessService.subscriptions.list(),
        canReadCustomers ? businessService.customers.list() : Promise.resolve({ items: [] as BusinessRecord[], page: 1, page_size: 100 }),
      ]);
      setRecords(rows.items);
      setCustomers(customerRows.items);
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [canReadCustomers]);
  useEffect(() => { void refresh(); }, [refresh]);
  return (
    <section aria-labelledby="subscriptions-title" className="mx-auto w-full max-w-7xl">
      <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="subscriptions-title">Subscriptions</h1><p className="mt-1 text-sm leading-6 text-slate-600">View subscription terms, billing dates, and lifecycle progress.</p></div>
      <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Subscriptions are created by converting customer-accepted quotations; direct subscription creation is not supported by the backend.</p>
      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => void refresh()} type="button">Retry</button></p>}
      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <SubscriptionSearch onChange={setSearch} value={search} />
        <label className="block w-full sm:max-w-xs"><span className="mb-1.5 block text-sm font-medium text-slate-700">Lifecycle status</span><select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => setStatus(event.target.value as SubscriptionStatus | "")} value={status}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="mt-4">{loading ? <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading subscriptions…</p> : <SubscriptionTable onView={(subscription) => navigate(`/app/subscriptions/details/${subscription.id}`)} subscriptions={subscriptions} />}</div>
    </section>
  );
}
