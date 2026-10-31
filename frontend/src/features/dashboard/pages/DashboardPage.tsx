import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CircleDollarSign, CreditCard, Package, Repeat, Users, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { RevenueChart } from "../../../components/charts/RevenueChart";
import { SubscriptionChart } from "../../../components/charts/SubscriptionChart";
import { businessService, getBusinessErrorMessage, type BusinessRecord, type DashboardSummary } from "../../../services/businessService";
import { MetricCard } from "../components/MetricCard";
import { ReportDateFilter } from "../components/ReportDateFilter";
import type { ReportDateRange, RevenueDataPoint, SubscriptionDataPoint } from "../types";

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenues, setRevenues] = useState<RevenueDataPoint[]>([]);
  const [subscriptions, setSubscriptions] = useState<BusinessRecord[]>([]);
  const [range, setRange] = useState<ReportDateRange>({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canReadSubscriptions = user?.role === "ADMIN" || (user?.role === "INTERNAL_STAFF" && user.permissions.includes("subscriptions:read"));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [stats, revenue, subscriptionPage] = await Promise.all([
        businessService.reports.summary(),
        businessService.reports.revenue(range.from || undefined, range.to || undefined),
        canReadSubscriptions ? businessService.subscriptions.list() : Promise.resolve({ items: [] as BusinessRecord[], page: 1, page_size: 100 }),
      ]);
      setSummary(stats);
      setRevenues(revenue.map((row) => ({ period: row.month, revenue: row.collected_paise / 100 })));
      setSubscriptions(subscriptionPage.items);
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [canReadSubscriptions, range]);

  useEffect(() => { void refresh(); }, [refresh]);

  const statusCounts = subscriptions.reduce<Record<string, number>>((counts, item) => {
    const status = typeof item.status === "string" ? item.status : "unknown";
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
  const subscriptionData: SubscriptionDataPoint[] = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  return (
    <section aria-labelledby="dashboard-title" className="dashboard-page mx-auto w-full max-w-7xl">
      <div className="dashboard-heading">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="dashboard-title">Overview</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">Subscription and billing summary.</p>
        </div>
        <div className="dashboard-date-filter">
          <ReportDateFilter onChange={setRange} />
        </div>
      </div>
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => void refresh()} type="button">Retry</button></div>}
      {loading && !summary ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600" aria-live="polite">Loading dashboard…</p> : (
        <>
          <div className="dashboard-metrics grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard description="Customer accounts" icon={Users} label="Customers" to="/app/customers" value={String(summary?.total_customers ?? 0)} />
            <MetricCard description="Active catalog records" icon={Package} label="Products" to="/app/products" value={String(summary?.total_products ?? 0)} />
            <MetricCard description="Current active subscription total" icon={Repeat} label="Active subscriptions" to="/app/subscriptions" value={String(summary?.active_subscriptions ?? 0)} />
            <MetricCard description="All invoices" icon={FileText} label="Invoices" to="/app/invoices" value={String(summary?.total_invoices ?? 0)} />
            <MetricCard description="Revenue received from recorded payments" icon={CircleDollarSign} label="Revenue received" to="/app/payments" value={money(summary?.collected_revenue_paise ?? 0)} />
            <MetricCard description="Amount remaining on invoices" icon={CreditCard} label="Outstanding amount" to="/app/invoices" value={money(summary?.outstanding_paise ?? 0)} />
            <MetricCard description="Invoices requiring overdue follow-up" icon={AlertCircle} label="Overdue invoices" to="/app/reports" value={String(summary?.overdue_invoices ?? 0)} />
          </div>
          <div className="dashboard-charts mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)]">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Revenue</h2>
              <p className="mt-1 text-sm text-slate-600">Recorded payment revenue over the selected date range.</p>
              <div className="mt-4"><RevenueChart data={revenues} /></div>
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Subscriptions</h2>
              <p className="mt-1 text-sm text-slate-600">Subscription overview by lifecycle state.</p>
              <div className="mt-4"><SubscriptionChart data={subscriptionData} /></div>
            </section>
          </div>
          <div className="dashboard-summaries mt-5 grid gap-4 xl:grid-cols-2">
            <RecordSummary title="Recent subscriptions" items={summary?.recent_subscriptions ?? []} detailKey="number" dateKey="created_at" fallback="No subscriptions yet." />
            <RecordSummary title="Recent payments" items={summary?.recent_transactions ?? []} detailKey="method" dateKey="recorded_at" fallback="No recorded payments yet." />
          </div>
        </>
      )}
    </section>
  );
}

function RecordSummary({ title, items, detailKey, dateKey, fallback }: {
  title: string; items: BusinessRecord[]; detailKey: string; dateKey: string; fallback: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <Link className="text-sm font-medium text-blue-700 hover:text-blue-800" to={title.includes("payment") ? "/app/payments" : "/app/subscriptions"}>View all</Link>
      </div>
      {items.length ? <ul className="mt-4 divide-y divide-slate-100">{items.map((item) => (
        <li className="flex justify-between gap-4 py-3 text-sm" key={item.id}>
          <span className="font-medium text-slate-800">{typeof item[detailKey] === "string" ? item[detailKey] as string : item.id}</span>
          <span className="text-slate-500">{typeof item[dateKey] === "string" ? new Date(item[dateKey] as string).toLocaleDateString() : "—"}</span>
        </li>
      ))}</ul> : <p className="mt-4 rounded-md bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{fallback}</p>}
    </section>
  );
}
