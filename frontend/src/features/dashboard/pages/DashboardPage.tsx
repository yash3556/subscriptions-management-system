import {
  AlertCircle,
  CircleDollarSign,
  CreditCard,
  Repeat,
} from "lucide-react";
import { Link } from "react-router-dom";
import { RevenueChart } from "../../../components/charts/RevenueChart";
import { SubscriptionChart } from "../../../components/charts/SubscriptionChart";
import { MetricCard } from "../components/MetricCard";
import { ReportDateFilter } from "../components/ReportDateFilter";
import type {
  ReportDateRange,
  RevenueDataPoint,
  SubscriptionDataPoint,
} from "../types";

const revenue: RevenueDataPoint[] = [];
const subscriptions: SubscriptionDataPoint[] = [];

export function DashboardPage() {
  function handleDateRange(_range: ReportDateRange) {
    // Report data is unavailable until the dashboard API is connected.
  }

  return (
    <section
      aria-labelledby="dashboard-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight text-slate-900"
          id="dashboard-title"
        >
          Overview
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Subscription and billing summary.
        </p>
      </div>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <ReportDateFilter onChange={handleDateRange} />
        <p className="mt-3 text-xs text-slate-500">
          Summary values will appear when dashboard data is connected.
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          description="Current active subscription total"
          icon={Repeat}
          label="Active subscriptions"
        />
        <MetricCard
          description="Revenue received from recorded payments"
          icon={CircleDollarSign}
          label="Revenue received"
        />
        <MetricCard
          description="Amount remaining on invoices"
          icon={CreditCard}
          label="Outstanding amount"
        />
        <MetricCard
          description="Invoices requiring overdue follow-up"
          icon={AlertCircle}
          label="Overdue invoices"
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Revenue</h2>
          <p className="mt-1 text-sm text-slate-600">
            Collected revenue over the selected date range.
          </p>
          <div className="mt-4">
            <RevenueChart data={revenue} />
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Subscriptions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Subscription overview by lifecycle state.
          </p>
          <div className="mt-4">
            <SubscriptionChart data={subscriptions} />
          </div>
        </section>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <EmptySummary
          description="Recent invoice information will appear when invoice data is connected."
          link="/app/invoices"
          title="Recent invoices"
          linkLabel="View invoices"
        />
        <EmptySummary
          description="Overdue invoices will appear when invoice and payment data is connected."
          link="/app/invoices"
          title="Overdue invoices"
          linkLabel="Review invoices"
        />
      </div>
    </section>
  );
}

function EmptySummary({
  title,
  description,
  link,
  linkLabel,
}: {
  title: string;
  description: string;
  link: string;
  linkLabel: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <Link
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
          to={link}
        >
          {linkLabel}
        </Link>
      </div>
      <p className="mt-4 rounded-md bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        {description}
      </p>
    </section>
  );
}
