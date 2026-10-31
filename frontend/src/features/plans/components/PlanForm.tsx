import { useState, type FormEvent } from "react";
import type { BillingFrequency, PlanFormValues, PlanRecord } from "../types";

interface PlanFormProps {
  initialPlan?: PlanRecord;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: PlanFormValues) => void;
}

const emptyValues: PlanFormValues = {
  name: "",
  price: "",
  frequency: "",
  minimumQuantity: "",
  availableFrom: "",
  availableUntil: "",
  autoCloseAtEnd: false,
  allowEarlyClosure: false,
  allowPause: false,
  allowRenewal: false,
};

function toFormValues(plan?: PlanRecord): PlanFormValues {
  if (!plan) return emptyValues;

  return {
    name: plan.name,
    price: String(plan.price),
    frequency: plan.frequency,
    minimumQuantity: String(plan.minimumQuantity),
    availableFrom: plan.availableFrom ?? "",
    availableUntil: plan.availableUntil ?? "",
    autoCloseAtEnd: plan.autoCloseAtEnd,
    allowEarlyClosure: plan.allowEarlyClosure,
    allowPause: plan.allowPause,
    allowRenewal: plan.allowRenewal,
  };
}

function isNonNegativeNumber(value: string) {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isPositiveInteger(value: string) {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isValidDate(value: string) {
  if (!value) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function TextField({
  id,
  label,
  value,
  error,
  type = "text",
  min,
  step,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  type?: "text" | "number" | "date";
  min?: string;
  step?: string;
  placeholder?: string;
  onChange: (value: string) => void;
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
        className={`block w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
        }`}
        id={id}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={step}
        type={type}
        value={value}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-700" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function PlanToggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3.5 hover:bg-slate-50"
      htmlFor={id}
    >
      <input
        checked={checked}
        className="mt-0.5 size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

const frequencyOptions: { value: BillingFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function PlanForm({
  initialPlan,
  submitLabel,
  onCancel,
  onSubmit,
}: PlanFormProps) {
  const [values, setValues] = useState(() => toFormValues(initialPlan));
  const [submitted, setSubmitted] = useState(false);

  const nameError =
    submitted && !values.name.trim() ? "Plan name is required." : "";
  const priceError =
    submitted && !isNonNegativeNumber(values.price)
      ? "Enter a valid non-negative price."
      : "";
  const frequencyError =
    submitted && !values.frequency ? "Select a billing frequency." : "";
  const quantityError =
    submitted && !isPositiveInteger(values.minimumQuantity)
      ? "Minimum quantity must be a positive whole number."
      : "";
  const startDateError =
    submitted && values.availableFrom && !isValidDate(values.availableFrom)
      ? "Enter a valid availability start date."
      : "";
  const endDateError =
    submitted && values.availableUntil && !isValidDate(values.availableUntil)
      ? "Enter a valid availability end date."
      : submitted &&
          values.availableFrom &&
          values.availableUntil &&
          isValidDate(values.availableFrom) &&
          isValidDate(values.availableUntil) &&
          values.availableUntil < values.availableFrom
        ? "Availability end date must be on or after the start date."
        : "";

  function updateField<K extends keyof PlanFormValues>(
    field: K,
    value: PlanFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (
      !values.name.trim() ||
      !isNonNegativeNumber(values.price) ||
      !values.frequency ||
      !isPositiveInteger(values.minimumQuantity) ||
      (values.availableFrom && !isValidDate(values.availableFrom)) ||
      (values.availableUntil && !isValidDate(values.availableUntil)) ||
      (values.availableFrom &&
        values.availableUntil &&
        values.availableUntil < values.availableFrom)
    ) {
      return;
    }

    onSubmit(values);
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <TextField
        error={nameError}
        id="plan-name"
        label="Plan name"
        onChange={(value) => updateField("name", value)}
        value={values.name}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          error={priceError}
          id="plan-price"
          label="Price"
          min="0"
          onChange={(value) => updateField("price", value)}
          step="0.01"
          type="number"
          value={values.price}
        />
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-slate-700"
            htmlFor="plan-frequency"
          >
            Billing frequency
          </label>
          <select
            aria-describedby={frequencyError ? "plan-frequency-error" : undefined}
            aria-invalid={Boolean(frequencyError)}
            className={`block w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 ${
              frequencyError
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
            }`}
            id="plan-frequency"
            onChange={(event) =>
              updateField(
                "frequency",
                event.target.value as BillingFrequency | "",
              )
            }
            value={values.frequency}
          >
            <option value="">Select frequency</option>
            {frequencyOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {frequencyError && (
            <p
              className="mt-1.5 text-sm text-red-700"
              id="plan-frequency-error"
              role="alert"
            >
              {frequencyError}
            </p>
          )}
        </div>
      </div>
      <TextField
        error={quantityError}
        id="plan-minimum-quantity"
        label="Minimum quantity"
        min="1"
        onChange={(value) => updateField("minimumQuantity", value)}
        step="1"
        type="number"
        value={values.minimumQuantity}
      />
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-900">
          Availability
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            error={startDateError}
            id="plan-available-from"
            label="Available from"
            onChange={(value) => updateField("availableFrom", value)}
            type="date"
            value={values.availableFrom}
          />
          <TextField
            error={endDateError}
            id="plan-available-until"
            label="Available until"
            onChange={(value) => updateField("availableUntil", value)}
            type="date"
            value={values.availableUntil}
          />
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-semibold text-slate-900">
          Lifecycle options
        </legend>
        <PlanToggle
          checked={values.autoCloseAtEnd}
          description="Automatically close the plan when its availability period ends."
          id="plan-auto-close"
          label="Automatically close at end"
          onChange={(checked) => updateField("autoCloseAtEnd", checked)}
        />
        <PlanToggle
          checked={values.allowEarlyClosure}
          description="Allow a plan to be closed before its availability period ends."
          id="plan-early-closure"
          label="Allow early closure"
          onChange={(checked) => updateField("allowEarlyClosure", checked)}
        />
        <PlanToggle
          checked={values.allowPause}
          description="Allow a plan to be paused."
          id="plan-allow-pause"
          label="Allow pausing"
          onChange={(checked) => updateField("allowPause", checked)}
        />
        <PlanToggle
          checked={values.allowRenewal}
          description="Allow a plan to be renewed."
          id="plan-allow-renewal"
          label="Allow renewal"
          onChange={(checked) => updateField("allowRenewal", checked)}
        />
      </fieldset>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button
          className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          type="submit"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
