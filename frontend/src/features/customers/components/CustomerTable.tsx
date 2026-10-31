import { UsersRound } from "lucide-react";
import type { CustomerSummary } from "../types";
import { CustomerActions } from "./CustomerActions";

interface CustomerTableProps {
  customers: CustomerSummary[];
  onView: (customer: CustomerSummary) => void;
  onEdit: (customer: CustomerSummary) => void;
}

function formatCreatedDate(date: string | undefined) {
  if (!date) return "—";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(parsedDate);
}

export function CustomerTable({
  customers,
  onView,
  onEdit,
}: CustomerTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-170 border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3.5" scope="col">
                Customer name
              </th>
              <th className="px-5 py-3.5" scope="col">
                Email
              </th>
              <th className="px-5 py-3.5" scope="col">
                Phone
              </th>
              <th className="px-5 py-3.5" scope="col">
                Created date
              </th>
              <th className="px-5 py-3.5" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((customer, index) => (
              <tr
                className="text-slate-700 hover:bg-slate-50"
                key={`${customer.createdAt ?? ""}-${customer.email}-${index}`}
              >
                <th
                  className="whitespace-nowrap px-5 py-4 font-medium text-slate-900"
                  scope="row"
                >
                  {customer.name}
                </th>
                <td className="whitespace-nowrap px-5 py-4">
                  {customer.email}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {customer.phone || "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  {formatCreatedDate(customer.createdAt)}
                </td>
                <td className="px-5 py-3">
                  <CustomerActions
                    onEdit={() => onEdit(customer)}
                    onView={() => onView(customer)}
                  />
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td className="px-5 py-14 text-center" colSpan={5}>
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                      <UsersRound aria-hidden="true" size={22} />
                    </span>
                    <p className="font-medium text-slate-900">
                      No customer records available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Customer records will appear here when the backend
                      integration is available.
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
