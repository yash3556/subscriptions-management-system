import { useState } from "react";
import type { ReportDateRange } from "../types";

interface ReportDateFilterProps {
  onChange: (range: ReportDateRange) => void;
}

export function ReportDateFilter({ onChange }: ReportDateFilterProps) {
  const [range, setRange] = useState<ReportDateRange>({ from: "", to: "" });
  const endDateError =
    range.from && range.to && range.to < range.from
      ? "End date must be on or after the start date."
      : "";

  function update(field: keyof ReportDateRange, value: string) {
    const updated = { ...range, [field]: value };
    setRange(updated);
    onChange(updated);
  }

  return (
    <fieldset className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <legend className="mb-3 text-sm font-medium text-slate-700">
        Date range
      </legend>
      <label className="block w-full sm:max-w-xs">
        <span className="mb-1.5 block text-sm text-slate-600">From</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          onChange={(event) => update("from", event.target.value)}
          type="date"
          value={range.from}
        />
      </label>
      <label className="block w-full sm:max-w-xs">
        <span className="mb-1.5 block text-sm text-slate-600">To</span>
        <input
          aria-describedby={endDateError ? "report-date-error" : undefined}
          aria-invalid={Boolean(endDateError)}
          className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
            endDateError
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
          }`}
          onChange={(event) => update("to", event.target.value)}
          type="date"
          value={range.to}
        />
        {endDateError && (
          <span className="mt-1 block text-sm text-red-700" id="report-date-error" role="alert">
            {endDateError}
          </span>
        )}
      </label>
    </fieldset>
  );
}
