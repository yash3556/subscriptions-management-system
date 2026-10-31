import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  description: string;
  icon: LucideIcon;
}

export function MetricCard({
  label,
  description,
  icon: Icon,
}: MetricCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-400" aria-label={`${label} unavailable`}>
            —
          </p>
        </div>
        <span className="rounded-md bg-slate-100 p-2.5 text-slate-500">
          <Icon aria-hidden="true" size={19} />
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </article>
  );
}
