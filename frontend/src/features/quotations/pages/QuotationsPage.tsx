import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { QuotationFormValues, QuotationRecord } from "../types";
import { QuotationDialog } from "../components/QuotationDialog";
import { QuotationTable } from "../components/QuotationTable";

const quotations: QuotationRecord[] = [];

export function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? quotations.filter((quotation) =>
          quotation.customerName.toLocaleLowerCase().includes(query),
        )
      : quotations;
  }, [search]);

  function handleSubmit(_values: QuotationFormValues) {
    setNotice(
      "Quotation creation is unavailable until backend integration. No quotation was saved.",
    );
  }

  return (
    <section
      aria-labelledby="quotations-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-slate-900"
            id="quotations-title"
          >
            Quotations
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Prepare customer offers from quotation templates.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          onClick={() => {
            setNotice("");
            setFormOpen(true);
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Create quotation
        </button>
      </div>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block w-full sm:max-w-sm">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Search by customer
          </span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
        </label>
      </div>
      {notice && (
        <p
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
          role="status"
        >
          {notice}
        </p>
      )}
      <div className="mt-4">
        <QuotationTable quotations={filtered} />
      </div>
      {formOpen && (
        <QuotationDialog
          notice={notice}
          onClose={() => {
            setFormOpen(false);
            setNotice("");
          }}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}
