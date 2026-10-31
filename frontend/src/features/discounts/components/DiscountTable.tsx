import { Percent } from "lucide-react";
import type { DiscountRecord } from "../types";

interface DiscountTableProps {
  discounts: DiscountRecord[];
  onEdit: (discount: DiscountRecord) => void;
  onDeactivate: (discount: DiscountRecord) => void;
}

export function DiscountTable({ discounts, onEdit, onDeactivate }: DiscountTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-195 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3.5" scope="col">Rule</th>
              <th className="px-5 py-3.5" scope="col">Type</th>
              <th className="px-5 py-3.5 text-right" scope="col">Value</th>
              <th className="px-5 py-3.5" scope="col">Applies to</th>
              <th className="px-5 py-3.5" scope="col">Starts</th>
              <th className="px-5 py-3.5" scope="col">Ends</th>
              <th className="px-5 py-3.5 text-right" scope="col">Usage limit</th>
              <th className="px-5 py-3.5 text-right" scope="col">Used</th>
              <th className="px-5 py-3.5" scope="col">Status</th>
              <th className="px-5 py-3.5" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {discounts.map((discount) => (
              <tr className="text-slate-700" key={discount.id}>
                <th className="px-5 py-4 font-medium text-slate-900" scope="row">
                  {discount.name}
                </th>
                <td className="px-5 py-4">
                  {discount.type === "fixed" ? "Fixed amount" : "Percentage"}
                </td>
                <td className="px-5 py-4 text-right tabular-nums">
                  {discount.value}
                  {discount.type === "percentage" ? "%" : ""}
                </td>
                <td className="px-5 py-4">
                  {discount.target === "subscriptions"
                    ? "Whole subscriptions"
                    : discount.eligibleProducts.join(", ")}
                </td>
                <td className="px-5 py-4">{discount.startsAt}</td>
                <td className="px-5 py-4">{discount.endsAt}</td>
                <td className="px-5 py-4 text-right">
                  {discount.usageLimit ?? "—"}
                </td>
                  <td className="px-5 py-4 text-right">{discount.usedCount}</td>
                  <td className="px-5 py-4">{discount.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-5 py-3 text-right">
                    {discount.isActive && <><button
                    className="rounded-md px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                    onClick={() => onEdit(discount)}
                    type="button"
                  >
                    Edit
                  </button><button className="ml-1 rounded-md px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50" onClick={() => onDeactivate(discount)} type="button">Disable</button></>}
                </td>
              </tr>
            ))}
            {discounts.length === 0 && (
              <tr>
                <td className="px-5 py-14 text-center" colSpan={10}>
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                      <Percent aria-hidden="true" size={22} />
                    </span>
                    <p className="font-medium text-slate-900">
                      No discount rules available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Discount rules will appear here when the backend is
                      connected.
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
