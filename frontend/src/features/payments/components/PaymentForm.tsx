import { useState, type FormEvent } from "react";
import type { PaymentFormValues } from "../types";

interface PaymentFormProps {
  onCancel: () => void;
  onSubmit: (values: PaymentFormValues) => void;
}

const initialValues: PaymentFormValues = {
  invoiceNumber: "",
  method: "",
  amount: "",
  date: "",
  note: "",
};

export function PaymentForm({ onCancel, onSubmit }: PaymentFormProps) {
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);

  function updateField(field: keyof PaymentFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const amountIsValid =
      values.amount.trim() !== "" &&
      Number.isFinite(Number(values.amount)) &&
      Number(values.amount) > 0;
    if (
      !values.invoiceNumber.trim() ||
      !values.method.trim() ||
      !amountIsValid ||
      !values.date
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
            submitted && !values.invoiceNumber.trim()
              ? "Invoice is required."
              : ""
          }
          id="payment-invoice"
          label="Invoice"
          onChange={(value) => updateField("invoiceNumber", value)}
          value={values.invoiceNumber}
        />
        <Field
          error={
            submitted && !values.method.trim()
              ? "Payment method is required."
              : ""
          }
          id="payment-method"
          label="Payment method"
          onChange={(value) => updateField("method", value)}
          value={values.method}
        />
        <Field
          error={
            submitted &&
            (!values.amount.trim() ||
              !Number.isFinite(Number(values.amount)) ||
              Number(values.amount) <= 0)
              ? "Enter a valid amount greater than zero."
              : ""
          }
          id="payment-amount"
          label="Amount"
          min="0"
          onChange={(value) => updateField("amount", value)}
          step="0.01"
          type="number"
          value={values.amount}
        />
        <Field
          error={submitted && !values.date ? "Payment date is required." : ""}
          id="payment-date"
          label="Date"
          onChange={(value) => updateField("date", value)}
          type="date"
          value={values.date}
        />
      </div>
      <div>
        <label
          className="mb-1.5 block text-sm font-medium text-slate-700"
          htmlFor="payment-note"
        >
          Note
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          id="payment-note"
          onChange={(event) => updateField("note", event.target.value)}
          value={values.note}
        />
      </div>
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
          Record payment
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
