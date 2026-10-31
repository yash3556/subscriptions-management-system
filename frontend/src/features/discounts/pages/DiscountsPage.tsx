import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DiscountDialog } from "../components/DiscountDialog";
import { DiscountTable } from "../components/DiscountTable";
import type { DiscountFormValues, DiscountRecord } from "../types";

const discounts: DiscountRecord[] = [];

export function DiscountsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] =
    useState<DiscountRecord | undefined>();
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? discounts.filter((discount) =>
          discount.name.toLocaleLowerCase().includes(query),
        )
      : discounts;
  }, [search]);

  function handleSubmit(_values: DiscountFormValues) {
    setNotice(
      "Discount rules are not saved until backend integration. No rule was created or changed.",
    );
  }

  return (
    <section
      aria-labelledby="discounts-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-slate-900"
            id="discounts-title"
          >
            Discounts
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Configure fixed or percentage discount rules and their eligibility.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          onClick={() => {
            setNotice("");
            setSelectedDiscount(undefined);
            setDialogOpen(true);
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Create discount
        </button>
      </div>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block w-full sm:max-w-sm">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Search discount rules
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
        <DiscountTable
          discounts={filtered}
          onEdit={(discount) => {
            setNotice("");
            setSelectedDiscount(discount);
            setDialogOpen(true);
          }}
        />
      </div>
      {dialogOpen && (
        <DiscountDialog
          discount={selectedDiscount}
          notice={notice}
          onClose={() => {
            setDialogOpen(false);
            setSelectedDiscount(undefined);
            setNotice("");
          }}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}
