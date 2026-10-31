import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  DiscountFormValues,
  DiscountRecord,
  DiscountTarget,
  DiscountType,
} from "../types";

interface DiscountFormProps {
  initialDiscount?: DiscountRecord;
  onCancel: () => void;
  onSubmit: (values: DiscountFormValues) => void;
}

const initialValues: DiscountFormValues = {
  name: "",
  type: "",
  value: "",
  minimumPurchase: "",
  minimumQuantity: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  target: "",
  eligibleProducts: [],
};

function isNonNegativeNumber(value: string) {
  return value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
}

function isPositiveInteger(value: string) {
  return value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) > 0;
}

function isValidDate(value: string) {
  return Boolean(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

export function DiscountForm({
  initialDiscount,
  onCancel,
  onSubmit,
}: DiscountFormProps) {
  const [values, setValues] = useState<DiscountFormValues>(() =>
    initialDiscount
      ? {
          name: initialDiscount.name,
          type: initialDiscount.type,
          value: String(initialDiscount.value),
          minimumPurchase:
            initialDiscount.minimumPurchase === undefined
              ? ""
              : String(initialDiscount.minimumPurchase),
          minimumQuantity:
            initialDiscount.minimumQuantity === undefined
              ? ""
              : String(initialDiscount.minimumQuantity),
          startsAt: initialDiscount.startsAt,
          endsAt: initialDiscount.endsAt,
          usageLimit:
            initialDiscount.usageLimit === undefined
              ? ""
              : String(initialDiscount.usageLimit),
          target: initialDiscount.target,
          eligibleProducts: [...initialDiscount.eligibleProducts],
        }
      : initialValues,
  );
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof DiscountFormValues>(
    key: K,
    value: DiscountFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const hasMinimumCondition =
      values.minimumPurchase !== "" || values.minimumQuantity !== "";
    const invalidThreshold =
      (values.minimumPurchase !== "" &&
        !isNonNegativeNumber(values.minimumPurchase)) ||
      (values.minimumQuantity !== "" &&
        !isPositiveInteger(values.minimumQuantity));
    const invalidTarget =
      !values.target ||
      (values.target === "products" &&
        values.eligibleProducts.every((product) => !product.trim()));
    if (
      !values.name.trim() ||
      !values.type ||
      !isNonNegativeNumber(values.value) ||
      !hasMinimumCondition ||
      invalidThreshold ||
      !isValidDate(values.startsAt) ||
      !isValidDate(values.endsAt) ||
      values.endsAt < values.startsAt ||
      (values.usageLimit !== "" && !isPositiveInteger(values.usageLimit)) ||
      invalidTarget
    ) {
      return;
    }

    onSubmit(values);
  }

  function productError(index: number) {
    return submitted &&
      values.target === "products" &&
      !values.eligibleProducts[index]?.trim()
      ? "Product is required."
      : "";
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <Field
        error={submitted && !values.name.trim() ? "Discount name is required." : ""}
        id="discount-name"
        label="Discount name"
        onChange={(value) => update("name", value)}
        value={values.name}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          error={submitted && !values.type ? "Select a discount type." : ""}
          id="discount-type"
          label="Discount type"
          onChange={(value) => update("type", value as DiscountType | "")}
          options={[
            { value: "fixed", label: "Fixed amount" },
            { value: "percentage", label: "Percentage" },
          ]}
          value={values.type}
        />
        <Field
          error={
            submitted && !isNonNegativeNumber(values.value)
              ? "Enter a valid non-negative value."
              : ""
          }
          id="discount-value"
          label={values.type === "percentage" ? "Percentage value" : "Amount"}
          min="0"
          onChange={(value) => update("value", value)}
          step="0.01"
          type="number"
          value={values.value}
        />
      </div>
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Minimum eligibility
        </legend>
        <p className="text-xs text-slate-500">
          Enter a minimum purchase, quantity, or both if the rule requires it.
        </p>
        {submitted &&
          values.minimumPurchase === "" &&
          values.minimumQuantity === "" && (
            <p className="text-sm text-red-700" role="alert">
              Enter a minimum purchase or minimum quantity.
            </p>
          )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={
              submitted &&
              values.minimumPurchase !== "" &&
              !isNonNegativeNumber(values.minimumPurchase)
                ? "Enter a non-negative minimum purchase."
                : ""
            }
            id="discount-min-purchase"
            label="Minimum purchase"
            min="0"
            onChange={(value) => update("minimumPurchase", value)}
            step="0.01"
            type="number"
            value={values.minimumPurchase}
          />
          <Field
            error={
              submitted &&
              values.minimumQuantity !== "" &&
              !isPositiveInteger(values.minimumQuantity)
                ? "Minimum quantity must be a positive whole number."
                : ""
            }
            id="discount-min-quantity"
            label="Minimum quantity"
            min="1"
            onChange={(value) => update("minimumQuantity", value)}
            step="1"
            type="number"
            value={values.minimumQuantity}
          />
        </div>
      </fieldset>
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Discount dates and usage
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={submitted && !isValidDate(values.startsAt) ? "Start date is required." : ""}
            id="discount-starts"
            label="Start date"
            onChange={(value) => update("startsAt", value)}
            type="date"
            value={values.startsAt}
          />
          <Field
            error={
              submitted
                ? !isValidDate(values.endsAt)
                  ? "End date is required."
                  : values.endsAt < values.startsAt
                    ? "End date must be on or after the start date."
                    : ""
                : ""
            }
            id="discount-ends"
            label="End date"
            onChange={(value) => update("endsAt", value)}
            type="date"
            value={values.endsAt}
          />
        </div>
        <Field
          error={
            submitted &&
            values.usageLimit !== "" &&
            !isPositiveInteger(values.usageLimit)
              ? "Usage limit must be a positive whole number."
              : ""
          }
          id="discount-usage-limit"
          label="Usage limit"
          min="1"
          onChange={(value) => update("usageLimit", value)}
          placeholder="Optional"
          step="1"
          type="number"
          value={values.usageLimit}
        />
      </fieldset>
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Applies to
        </legend>
        <SelectField
          error={
            submitted && !values.target
              ? "Choose products or whole subscriptions."
              : submitted &&
                  values.target === "products" &&
                  values.eligibleProducts.every((product) => !product.trim())
                ? "Add at least one eligible product."
                : ""
          }
          id="discount-target"
          label="Discount target"
          onChange={(value) => update("target", value as DiscountTarget | "")}
          options={[
            { value: "products", label: "Specific products" },
            { value: "subscriptions", label: "Whole subscriptions" },
          ]}
          value={values.target}
        />
        {values.target === "products" && (
          <div className="space-y-3">
            {values.eligibleProducts.map((product, index) => (
              <div
                className="grid gap-2 sm:grid-cols-[1fr_auto]"
                key={index}
              >
                <Field
                  error={productError(index)}
                  id={`discount-product-${index}`}
                  label={`Eligible product ${index + 1}`}
                  onChange={(value) =>
                    update(
                      "eligibleProducts",
                      values.eligibleProducts.map((item, itemIndex) =>
                        itemIndex === index ? value : item,
                      ),
                    )
                  }
                  value={product}
                />
                <button
                  aria-label={`Remove eligible product ${index + 1}`}
                  className="mt-6 inline-flex size-10 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-700"
                  onClick={() =>
                    update(
                      "eligibleProducts",
                      values.eligibleProducts.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              </div>
            ))}
            <button
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() =>
                update("eligibleProducts", [...values.eligibleProducts, ""])
              }
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              Add eligible product
            </button>
          </div>
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
          Save discount rule
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
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "number" | "date";
  min?: string;
  step?: string;
  placeholder?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={id}>
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
        placeholder={placeholder}
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

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-300 focus:border-blue-600 focus:ring-blue-100"
        }`}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-700" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
