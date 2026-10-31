import { useState } from "react";
import { AlertCircle, CircleDollarSign, CreditCard } from "lucide-react";
import { RevenueChart } from "../../../components/charts/RevenueChart";
import { MetricCard } from "../../dashboard/components/MetricCard";
import { ReportDateFilter } from "../../dashboard/components/ReportDateFilter";
import type {
  ReportDateRange,
  RevenueDataPoint,
} from "../../dashboard/types";

const revenue: RevenueDataPoint[] = [];

export function ReportsPage() {
  const [dateRange, setDateRange] = useState<ReportDateRange>({
    from: "",
    to: "",
  });

  return (
    <section
      aria-labelledby="reports-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight text-slate-900"
          id="reports-title"
        >
          Reports
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Review collected revenue, outstanding amounts, and overdue invoices.
        </p>
      </div>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <ReportDateFilter onChange={setDateRange} />
        <p className="mt-3 text-xs text-slate-500">
          {dateRange.from || dateRange.to
            ? "Report filters are ready; data will load after backend integration."
            : "Select a date range. Report data is not connected yet."}
        </p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <MetricCard
          description="Based on recorded payments"
          icon={CircleDollarSign}
          label="Collected revenue"
        />
        <MetricCard
          description="Remaining invoice balances"
          icon={CreditCard}
          label="Outstanding"
        />
        <MetricCard
          description="Invoices that need follow-up"
          icon={AlertCircle}
          label="Overdue invoices"
        />
      </div>
      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Revenue summary</h2>
        <p className="mt-1 text-sm text-slate-600">
          Revenue over the selected date range.
        </p>
        <div className="mt-4">
          <RevenueChart data={revenue} />
        </div>
      </section>
    </section>
  );
}
