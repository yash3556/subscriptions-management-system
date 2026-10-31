import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SubscriptionDataPoint } from "../../features/dashboard/types";

export function SubscriptionChart({
  data,
}: {
  data: SubscriptionDataPoint[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-md bg-slate-50 px-4 text-center text-sm text-slate-500">
        Subscription chart data is not available yet.
      </div>
    );
  }

  return (
    <div
      aria-label="Subscriptions by lifecycle state chart"
      className="h-64 w-full"
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="status" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip />
          <Bar
            dataKey="count"
            fill="#0f766e"
            name="Subscriptions"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}