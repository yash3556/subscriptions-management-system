import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueDataPoint } from "../../features/dashboard/types";

export function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-md bg-slate-50 px-4 text-center text-sm text-slate-500">
        Revenue chart data is not available yet.
      </div>
    );
  }

  return (
    <div aria-label="Revenue chart" className="h-64 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={(value: number) => value.toLocaleString()}
          />
          <Tooltip />
          <Line
            dataKey="revenue"
            name="Revenue"
            stroke="#2563eb"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}