import { ClipboardList } from "lucide-react";
import type { PlanRecord } from "../types";
import { PlanActions } from "./PlanActions";

interface PlanTableProps {
  plans: PlanRecord[];
  canWrite?: boolean;
  onView: (plan: PlanRecord) => void;
  onEdit: (plan: PlanRecord) => void;
  onDeactivate: (plan: PlanRecord) => void;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

const frequencyLabels: Record<PlanRecord["frequency"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function PlanTable({ plans, canWrite = false, onView, onEdit, onDeactivate }: PlanTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-162.5 border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3.5" scope="col">
                Plan name
              </th>
              <th className="px-5 py-3.5 text-right" scope="col">
                Price
              </th>
              <th className="px-5 py-3.5" scope="col">
                Billing frequency
              </th>
              <th className="px-5 py-3.5 text-center" scope="col">
                Minimum quantity
              </th>
              <th className="px-5 py-3.5" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((plan, index) => (
              <tr
                className="text-slate-700 hover:bg-slate-50"
                key={plan.id || `${plan.name}-${index}`}
              >
                <th
                  className="whitespace-nowrap px-5 py-4 font-medium text-slate-900"
                  scope="row"
                >
                  {plan.name} {!plan.isActive && <span className="ml-2 text-xs text-slate-500">(inactive)</span>}
                </th>
                <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                  {formatPrice(plan.price)}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {frequencyLabels[plan.frequency]}
                </td>
                <td className="px-5 py-4 text-center tabular-nums">
                  {plan.minimumQuantity}
                </td>
                <td className="px-5 py-3">
                  <PlanActions
                    canWrite={canWrite}
                    onEdit={() => onEdit(plan)}
                    onDeactivate={() => onDeactivate(plan)}
                    onView={() => onView(plan)}
                  />
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td className="px-5 py-14 text-center" colSpan={5}>
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                      <ClipboardList aria-hidden="true" size={22} />
                    </span>
                    <p className="font-medium text-slate-900">
                      No subscription plans available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Add a subscription plan to get started.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
