import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvoiceStatusBadge } from "../components/InvoiceStatusBadge";
import { InvoiceTable } from "../components/InvoiceTable";
import type { InvoiceRecord, InvoiceStatus } from "../types";

const invoices: InvoiceRecord[] = [];
const statuses: InvoiceStatus[] = ["Draft", "Confirmed", "Paid"];

export function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch =
        !query ||
        [invoice.number, invoice.customer, invoice.subscriptionNumber].some(
          (value) => value.toLocaleLowerCase().includes(query),
        );
      return matchesSearch && (!status || invoice.status === status);
    });
  }, [search, status]);

  return (
    <section
      aria-labelledby="invoices-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight text-slate-900"
          id="invoices-title"
        >
          Invoices
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          Review invoices generated from subscription billing.
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
        <label className="block w-full sm:max-w-sm">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Search invoices
          </span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
        </label>
        <label className="block w-full sm:max-w-xs">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Invoice status
          </span>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            onChange={(event) =>
              setStatus(event.target.value as InvoiceStatus | "")
            }
            value={status}
          >
            <option value="">All statuses</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4">
        <InvoiceTable
          invoices={filtered}
          onView={(invoice) =>
            navigate("/app/invoices/details", { state: invoice })
          }
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        {statuses.map((item) => (
          <span className="inline-flex items-center gap-1.5" key={item}>
            <InvoiceStatusBadge status={item} />
            Invoice lifecycle
          </span>
        ))}
      </div>
    </section>
  );
}
