import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface MetricCardProps {
  label: string;
  description: string;
  icon: LucideIcon;
  value?: string;
  to?: string;
}

export function MetricCard({
  label,
  description,
  icon: Icon,
  value = "—",
  to,
}: MetricCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <span className="rounded-md bg-slate-100 p-2.5 text-slate-500">
          <Icon aria-hidden="true" size={19} />
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </>
  );
  return to ? (
    <Link className="block rounded-lg border border-slate-200 bg-white p-5 hover:border-purple-300 focus-visible:outline-2 focus-visible:outline-blue-700" to={to}>
      {content}
    </Link>
  ) : (
    <article className="rounded-lg border border-slate-200 bg-white p-5">{content}</article>
  );
}
