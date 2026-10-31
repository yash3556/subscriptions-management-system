import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  SubscriptionFormValues,
  SubscriptionLineFormValue,
  SubscriptionRecord,
} from "../types";

interface SubscriptionFormProps {
  initialSubscription?: SubscriptionRecord;
  onCancel: () => void;
  onSubmit: (values: SubscriptionFormValues) => void;
}

const initialValues: SubscriptionFormValues = {
  customer: "",
  plan: "",
  startDate: "",
  expiryDate: "",
  paymentTerms: "",
  lines: [],
};

function isNonNegativeNumber(value: string) {
  return value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
}

function isPositiveInteger(value: string) {
  return value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) > 0;
}

export function SubscriptionForm({
  initialSubscription,
  onCancel,
  onSubmit,
}: SubscriptionFormProps) {
  const [values, setValues] = useState<SubscriptionFormValues>(() =>
    initialSubscription
      ? {
          customer: initialSubscription.customer,
          plan: initialSubscription.plan,
          startDate: initialSubscription.startDate,
          expiryDate: initialSubscription.expiryDate,
          paymentTerms: initialSubscription.paymentTerms,
          lines: initialSubscription.lines.map((line) => ({
            product: line.product,
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            taxes: line.taxes,
          })),
        }
      : initialValues,
  );
  const [submitted, setSubmitted] = useState(false);

  function updateLine(
    index: number,
    field: keyof SubscriptionLineFormValue,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const invalidLines =
      values.lines.length === 0 ||
      values.lines.some(
        (line) =>
          !line.product.trim() ||
          !isPositiveInteger(line.quantity) ||
          !isNonNegativeNumber(line.unitPrice),
      );
    if (
      !values.customer.trim() ||
      !values.plan.trim() ||
      !values.startDate ||
      !values.expiryDate ||
      values.expiryDate < values.startDate ||
      !values.paymentTerms.trim() ||
      invalidLines
    ) {
      return;
    }

    onSubmit(values);
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          error={
            submitted && !values.customer.trim() ? "Customer is required." : ""
          }
          id="subscription-customer"
          label="Customer"
          onChange={(customer) =>
            setValues((current) => ({ ...current, customer }))
          }
          value={values.customer}
        />
        <Field
          error={submitted && !values.plan.trim() ? "Plan is required." : ""}
          id="subscription-plan"
          label="Plan"
          onChange={(plan) => setValues((current) => ({ ...current, plan }))}
          value={values.plan}
        />
        <Field
          error={submitted && !values.startDate ? "Start date is required." : ""}
          id="subscription-start"
          label="Start date"
          onChange={(startDate) =>
            setValues((current) => ({ ...current, startDate }))
          }
          type="date"
          value={values.startDate}
        />
        <Field
          error={
            submitted
              ? !values.expiryDate
              ? "Expiry date is required."
              : values.expiryDate < values.startDate
                ? "Expiry date must be on or after the start date."
                : ""
              : ""
          }
          id="subscription-expiry"
          label="Expiry date"
          onChange={(expiryDate) =>
            setValues((current) => ({ ...current, expiryDate }))
          }
          type="date"
          value={values.expiryDate}
        />
      </div>
      <div>
        <label
          className="mb-1.5 block text-sm font-medium text-slate-700"
          htmlFor="subscription-payment-terms"
        >
          Payment terms
        </label>
        <textarea
          aria-invalid={submitted && !values.paymentTerms.trim()}
          className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          id="subscription-payment-terms"
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              paymentTerms: event.target.value,
            }))
          }
          value={values.paymentTerms}
        />
        {submitted && !values.paymentTerms.trim() && (
          <p className="mt-1 text-sm text-red-700" role="alert">
            Payment terms are required.
          </p>
        )}
      </div>
      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Subscription lines
        </legend>
        <p className="text-xs leading-5 text-slate-500">
          Line amounts and taxes are confirmed by the backend; this form does
          not calculate totals.
        </p>
        {values.lines.map((line, index) => (
          <div
            className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-2"
            key={index}
          >
            <Field
              error={
                submitted && !line.product.trim()
                  ? "Product is required."
                  : ""
              }
              id={`subscription-line-product-${index}`}
              label="Product"
              onChange={(product) => updateLine(index, "product", product)}
              value={line.product}
            />
            <Field
              error={
                submitted && !isPositiveInteger(line.quantity)
                  ? "Quantity must be a positive whole number."
                  : ""
              }
              id={`subscription-line-quantity-${index}`}
              label="Quantity"
              min="1"
              onChange={(quantity) =>
                updateLine(index, "quantity", quantity)
              }
              step="1"
              type="number"
              value={line.quantity}
            />
            <Field
              error={
                submitted && !isNonNegativeNumber(line.unitPrice)
                  ? "Enter a non-negative unit price."
                  : ""
              }
              id={`subscription-line-price-${index}`}
              label="Unit price"
              min="0"
              onChange={(unitPrice) =>
                updateLine(index, "unitPrice", unitPrice)
              }
              step="0.01"
              type="number"
              value={line.unitPrice}
            />
            <Field
              id={`subscription-line-taxes-${index}`}
              label="Taxes"
              onChange={(taxes) => updateLine(index, "taxes", taxes)}
              value={line.taxes}
            />
            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <p className="text-xs text-slate-500">
                Line amount: calculated by backend
              </p>
              <button
                aria-label={`Remove subscription line ${index + 1}`}
                className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
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
          </div>
        ))}
        <button
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() =>
            setValues((current) => ({
              ...current,
              lines: [
                ...current.lines,
                { product: "", quantity: "", unitPrice: "", taxes: "" },
              ],
            }))
          }
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          Add line
        </button>
        {submitted && values.lines.length === 0 && (
          <p className="text-sm text-red-700" role="alert">
            Add at least one subscription line.
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
          Save subscription
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
  step,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "number" | "date";
  min?: string;
  step?: string;
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
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
        }`}
        id={id}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        step={step}
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
