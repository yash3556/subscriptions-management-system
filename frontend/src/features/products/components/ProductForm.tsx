import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  ProductFormValues,
  ProductRecord,
  ProductVariantFormValue,
} from "../types";

interface ProductFormProps {
  initialProduct?: ProductRecord;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: ProductFormValues) => void;
}

const emptyValues: ProductFormValues = {
  name: "",
  type: "",
  salesPrice: "",
  costPrice: "",
  notes: "",
  variants: [],
};

function toFormValues(product?: ProductRecord): ProductFormValues {
  if (!product) return emptyValues;

  return {
    name: product.name,
    type: product.type,
    salesPrice: String(product.salesPrice),
    costPrice: String(product.costPrice),
    notes: product.notes ?? "",
    variants: product.variants.map((variant) => ({
      attribute: variant.attribute,
      value: variant.value,
      additionalPrice: String(variant.additionalPrice),
    })),
  };
}

function isNonNegativeNumber(value: string) {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  type?: "text" | "number";
  placeholder?: string;
  min?: string;
  step?: string;
  onChange: (value: string) => void;
}

function ProductField({
  id,
  label,
  value,
  error,
  type = "text",
  placeholder,
  min,
  step,
  onChange,
}: FieldProps) {
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

export function ProductForm({
  initialProduct,
  submitLabel,
  onCancel,
  onSubmit,
}: ProductFormProps) {
  const [values, setValues] = useState(() => toFormValues(initialProduct));
  const [submitted, setSubmitted] = useState(false);

  const nameError =
    submitted && !values.name.trim() ? "Product name is required." : "";
  const typeError =
    submitted && !values.type.trim() ? "Product type is required." : "";
  const salesPriceError =
    submitted && !isNonNegativeNumber(values.salesPrice)
      ? "Enter a valid non-negative sales price."
      : "";
  const costPriceError =
    submitted && !isNonNegativeNumber(values.costPrice)
      ? "Enter a valid non-negative cost price."
      : "";

  function updateField(
    field: Exclude<keyof ProductFormValues, "variants">,
    value: string,
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function updateVariant(
    index: number,
    field: keyof ProductVariantFormValue,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    }));
  }

  function addVariant() {
    setValues((current) => ({
      ...current,
      variants: [
        ...current.variants,
        { attribute: "", value: "", additionalPrice: "" },
      ],
    }));
  }

  function removeVariant(index: number) {
    setValues((current) => ({
      ...current,
      variants: current.variants.filter(
        (_, variantIndex) => variantIndex !== index,
      ),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const invalidVariant = values.variants.some(
      (variant) =>
        !variant.attribute.trim() ||
        !variant.value.trim() ||
        !isNonNegativeNumber(variant.additionalPrice),
    );
    if (
      !values.name.trim() ||
      !values.type.trim() ||
      !isNonNegativeNumber(values.salesPrice) ||
      !isNonNegativeNumber(values.costPrice) ||
      invalidVariant
    ) {
      return;
    }

    onSubmit(values);
  }

  function variantError(index: number, field: keyof ProductVariantFormValue) {
    if (!submitted) return "";
    const variant = values.variants[index];
    if (field === "attribute" && !variant.attribute.trim()) {
      return "Attribute is required.";
    }
    if (field === "value" && !variant.value.trim()) {
      return "Variant value is required.";
    }
    if (
      field === "additionalPrice" &&
      !isNonNegativeNumber(variant.additionalPrice)
    ) {
      return "Enter a valid non-negative additional price.";
    }
    return "";
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <ProductField
        error={nameError}
        id="product-name"
        label="Product name"
        onChange={(value) => updateField("name", value)}
        value={values.name}
      />
      <ProductField
        error={typeError}
        id="product-type"
        label="Product type"
        onChange={(value) => updateField("type", value)}
        placeholder="Enter product type"
        value={values.type}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <ProductField
          error={salesPriceError}
          id="product-sales-price"
          label="Sales price"
          min="0"
          onChange={(value) => updateField("salesPrice", value)}
          step="0.01"
          type="number"
          value={values.salesPrice}
        />
        <ProductField
          error={costPriceError}
          id="product-cost-price"
          label="Cost price"
          min="0"
          onChange={(value) => updateField("costPrice", value)}
          step="0.01"
          type="number"
          value={values.costPrice}
        />
      </div>
      <div>
        <label
          className="mb-1.5 block text-sm font-medium text-slate-700"
          htmlFor="product-notes"
        >
          Notes
        </label>
        <textarea
          className="block min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          id="product-notes"
          onChange={(event) => updateField("notes", event.target.value)}
          value={values.notes}
        />
      </div>
      <section
        aria-labelledby="product-variants-title"
        className="space-y-4 rounded-lg border border-slate-200 p-4"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3
              className="text-sm font-semibold text-slate-900"
              id="product-variants-title"
            >
              Product variants
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Add an attribute, value, and price adjustment for each variant.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:self-auto"
            onClick={addVariant}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            Add variant
          </button>
        </div>
        {values.variants.length === 0 ? (
          <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
            No variants added.
          </p>
        ) : (
          <div className="space-y-4">
            {values.variants.map((variant, index) => (
              <fieldset
                className="grid gap-4 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                key={index}
              >
                <legend className="sr-only">Variant {index + 1}</legend>
                <ProductField
                  error={variantError(index, "attribute")}
                  id={`variant-attribute-${index}`}
                  label="Attribute"
                  onChange={(value) =>
                    updateVariant(index, "attribute", value)
                  }
                  placeholder="e.g. Brand"
                  value={variant.attribute}
                />
                <ProductField
                  error={variantError(index, "value")}
                  id={`variant-value-${index}`}
                  label="Value"
                  onChange={(value) => updateVariant(index, "value", value)}
                  placeholder="e.g. Odoo"
                  value={variant.value}
                />
                <ProductField
                  error={variantError(index, "additionalPrice")}
                  id={`variant-price-${index}`}
                  label="Additional price"
                  min="0"
                  onChange={(value) =>
                    updateVariant(index, "additionalPrice", value)
                  }
                  step="0.01"
                  type="number"
                  value={variant.additionalPrice}
                />
                <button
                  aria-label={`Remove variant ${index + 1}`}
                  className="mt-6 inline-flex size-10 items-center justify-center self-start rounded-md text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-700"
                  onClick={() => removeVariant(index)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              </fieldset>
            ))}
          </div>
        )}
      </section>
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
