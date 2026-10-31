import { FileText } from "lucide-react";
import type { QuotationRecord } from "../types";

interface QuotationTableProps {
  quotations: QuotationRecord[];
}

export function QuotationTable({ quotations }: QuotationTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-150 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3.5" scope="col">
                Customer
              </th>
              <th className="px-5 py-3.5" scope="col">
                Template
              </th>
              <th className="px-5 py-3.5 text-center" scope="col">
                Validity (days)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotations.map((quotation, index) => (
              <tr
                className="text-slate-700"
                key={`${quotation.number ?? quotation.customerName}-${index}`}
              >
                <th className="px-5 py-4 font-medium text-slate-900" scope="row">
                  {quotation.customerName}
                </th>
                <td className="px-5 py-4">{quotation.templateName}</td>
                <td className="px-5 py-4 text-center">
                  {quotation.validityDays}
                </td>
              </tr>
            ))}
            {quotations.length === 0 && (
              <tr>
                <td className="px-5 py-14 text-center" colSpan={3}>
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                      <FileText aria-hidden="true" size={22} />
                    </span>
                    <p className="font-medium text-slate-900">
                      No quotations available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Quotations will appear here when the backend is connected.
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
