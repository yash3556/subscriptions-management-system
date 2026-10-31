import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  QuotationFormValues,
  QuotationLine,
  QuotationRecord,
} from "../types";

interface QuotationFormProps {
  initialQuotation?: QuotationRecord;
  onCancel: () => void;
  onSubmit: (values: QuotationFormValues) => void;
}

const initialValues: QuotationFormValues = {
  customerName: "",
  templateName: "",
  validityDays: "",
  lines: [],
};

function isPositiveInteger(value: string) {
  return value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) > 0;
}

export function QuotationForm({
  initialQuotation,
  onCancel,
  onSubmit,
}: QuotationFormProps) {
  const [values, setValues] = useState<QuotationFormValues>(() =>
    initialQuotation
      ? {
          customerName: initialQuotation.customerName,
          templateName: initialQuotation.templateName,
          validityDays: initialQuotation.validityDays,
          lines: initialQuotation.lines.map((line) => ({ ...line })),
        }
      : initialValues,
  );
  const [submitted, setSubmitted] = useState(false);

  function updateLine(index: number, patch: Partial<QuotationLine>) {
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (
      !values.customerName.trim() ||
      !values.templateName.trim() ||
      !isPositiveInteger(values.validityDays) ||
      values.lines.length === 0 ||
      values.lines.some((line) => !line.name.trim())
    ) {
      return;
    }
    onSubmit(values);
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <Field
        error={
          submitted && !values.customerName.trim()
            ? "Customer is required."
            : ""
        }
        id="quotation-customer"
        label="Customer"
        onChange={(customerName) =>
          setValues((current) => ({ ...current, customerName }))
        }
        value={values.customerName}
      />
      <Field
        error={
          submitted && !values.templateName.trim()
            ? "Quotation template is required."
            : ""
        }
        id="quotation-template"
        label="Quotation template"
        onChange={(templateName) =>
          setValues((current) => ({ ...current, templateName }))
        }
        value={values.templateName}
      />
      <Field
        error={
          submitted && !isPositiveInteger(values.validityDays)
            ? "Validity must be a positive whole number of days."
            : ""
        }
        id="quotation-validity"
        label="Validity period (days)"
        min="1"
        onChange={(validityDays) =>
          setValues((current) => ({ ...current, validityDays }))
        }
        type="number"
        value={values.validityDays}
      />
      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Product and plan lines
        </legend>
        <p className="text-xs leading-5 text-slate-500">
          Add the products and plans included by the selected template.
        </p>
        {values.lines.map((line, index) => (
          <div
            className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[10rem_1fr_auto]"
            key={index}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Line type
              </span>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                onChange={(event) =>
                  updateLine(index, {
                    type: event.target.value as QuotationLine["type"],
                  })
                }
                value={line.type}
              >
                <option value="product">Product</option>
                <option value="plan">Plan</option>
              </select>
            </label>
            <Field
              error={
                submitted && !line.name.trim() ? "Line item is required." : ""
              }
              id={`quotation-line-${index}`}
              label="Product or plan"
              onChange={(name) => updateLine(index, { name })}
              value={line.name}
            />
            <button
              aria-label={`Remove line ${index + 1}`}
              className="mt-6 inline-flex size-10 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-700"
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  lines: current.lines.filter(
                    (_, lineIndex) => lineIndex !== index,
                  ),
                }))
              }
              type="button"
            >
              <Trash2 aria-hidden="true" size={17} />
            </button>
          </div>
        ))}
        <button
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-700"
          onClick={() =>
            setValues((current) => ({
              ...current,
              lines: [...current.lines, { type: "product", name: "" }],
            }))
          }
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          Add line
        </button>
        {submitted && values.lines.length === 0 && (
          <p className="text-sm text-red-700" role="alert">
            Add at least one product or plan line.
          </p>
        )}
      </fieldset>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button
          className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          type="submit"
        >
          Create quotation
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  min,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "number";
  min?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label
        className="mb-1.5 block text-sm font-medium text-slate-700"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
        }`}
        id={id}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error && (
        <p className="mt-1 text-sm text-red-700" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
