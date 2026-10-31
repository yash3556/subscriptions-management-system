import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CircleDollarSign, CreditCard, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { RevenueChart } from "../../../components/charts/RevenueChart";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { ReportDateFilter } from "../../dashboard/components/ReportDateFilter";
import type { ReportDateRange, RevenueDataPoint } from "../../dashboard/types";
import {
  businessService,
  getBusinessErrorMessage,
  type BusinessRecord,
  type DashboardSummary,
} from "../../../services/businessService";

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export function ReportsPage() {
  const [range, setRange] = useState<ReportDateRange>({ from: "", to: "" });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [overdue, setOverdue] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [stats, revenueRows, overdueRows] = await Promise.all([
        businessService.reports.summary(),
        businessService.reports.revenue(range.from || undefined, range.to || undefined),
        businessService.reports.overdue(),
      ]);
      setSummary(stats);
      setRevenue(revenueRows.map((row) => ({ period: row.month, revenue: row.collected_paise / 100 })));
      setOverdue(overdueRows.items);
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  function exportOverdueCsv() {
    const header = ["Invoice", "Customer ID", "Due at", "Total paise", "Paid paise", "Outstanding paise"];
    const rows = overdue.map((invoice) => [
      invoice.number,
      invoice.customer_id,
      invoice.due_at,
      invoice.total_paise,
      invoice.amount_paid_paise,
      invoice.outstanding_paise,
    ]);
    const csv = [header, ...rows].map((row) => row.map((field) => `"${String(field ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "brightloop-overdue-invoices.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-labelledby="reports-title" className="mx-auto w-full max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="reports-title">Reports</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">Review revenue, invoice balances, and overdue follow-up from live records.</p>
      </div>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5"><ReportDateFilter onChange={setRange} /></div>
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => void load()} type="button">Retry</button></div>}
      {loading && !summary ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600" aria-live="polite">Loading reports…</p> : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <MetricCard description="Based on recorded payments" icon={CircleDollarSign} label="Collected revenue" value={money(summary?.collected_revenue_paise ?? 0)} />
            <MetricCard description="Remaining invoice balances" icon={CreditCard} label="Outstanding" value={money(summary?.outstanding_paise ?? 0)} />
            <MetricCard description="Invoices that need follow-up" icon={AlertCircle} label="Overdue invoices" value={String(summary?.overdue_invoices ?? 0)} to="/app/invoices" />
          </div>
          <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Revenue summary</h2>
            <p className="mt-1 text-sm text-slate-600">Recorded payment revenue over the selected date range.</p>
            <div className="mt-4"><RevenueChart data={revenue} /></div>
          </section>
          <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold text-slate-900">Overdue invoices</h2><p className="mt-1 text-sm text-slate-600">Open invoice balances past their due date.</p></div>
              <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50" onClick={exportOverdueCsv} type="button"><Download aria-hidden="true" size={16} /> Export CSV</button>
            </div>
            {overdue.length ? (
              <div className="mt-4 overflow-x-auto"><table className="w-full min-w-140 text-left text-sm">
                <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Invoice</th><th className="py-2">Due date</th><th className="py-2 text-right">Outstanding</th><th /></tr></thead>
                <tbody className="divide-y divide-slate-100">{overdue.map((invoice) => (
                  <tr key={invoice.id}><th className="py-3 font-medium text-slate-900">{String(invoice.number ?? invoice.id)}</th><td className="py-3">{typeof invoice.due_at === "string" ? new Date(invoice.due_at).toLocaleDateString() : "—"}</td><td className="py-3 text-right">{money(Math.max(0, Number(invoice.total_paise ?? 0) - Number(invoice.amount_paid_paise ?? 0)))}</td><td className="py-3 text-right"><Link className="text-blue-700 hover:underline" to="/app/invoices">Open</Link></td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="mt-4 rounded-md bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No overdue invoices.</p>}
          </section>
          <p className="mt-4 text-xs text-slate-500">Customer/product performance and subscription status breakdown do not have dedicated backend report endpoints yet.</p>
        </>
      )}
    </section>
  );
}
