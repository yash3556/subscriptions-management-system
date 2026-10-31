import { useState, type FormEvent } from "react";
import { AuthTextField } from "../../auth/components/AuthTextField";
import type { CustomerFormValues } from "../types";

interface CustomerFormProps {
  initialValues?: CustomerFormValues;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: CustomerFormValues) => void;
}

const emptyValues: CustomerFormValues = {
  name: "",
  email: "",
  phone: "",
  billingAddress: "",
};

export function CustomerForm({
  initialValues = emptyValues,
  submitLabel,
  onCancel,
  onSubmit,
}: CustomerFormProps) {
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);

  const nameError =
    submitted && !values.name.trim() ? "Customer name is required." : "";
  const emailError = submitted
    ? !values.email.trim()
      ? "Email is required."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
        ? "Enter a valid email address."
        : ""
    : "";
  function updateField(field: keyof CustomerFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (
      !values.name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
    ) {
      return;
    }

    onSubmit(values);
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <AuthTextField
        autoComplete="name"
        error={nameError}
        id="customer-name"
        label="Customer name"
        name="name"
        onChange={(event) => updateField("name", event.target.value)}
        required
        value={values.name}
      />
      <AuthTextField
        autoComplete="email"
        error={emailError}
        id="customer-email"
        label="Email"
        name="email"
        onChange={(event) => updateField("email", event.target.value)}
        required
        type="email"
        value={values.email}
      />
      <AuthTextField
        autoComplete="tel"
        id="customer-phone"
        label="Phone"
        name="phone"
        onChange={(event) => updateField("phone", event.target.value)}
        placeholder="Optional"
        type="tel"
        value={values.phone}
      />
      <div>
        <label
          className="mb-1.5 block text-sm font-medium text-slate-700"
          htmlFor="customer-billing-address"
        >
          Billing address
        </label>
        <textarea
          className="block min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          id="customer-billing-address"
          name="billingAddress"
          onChange={(event) =>
            updateField("billingAddress", event.target.value)
          }
          placeholder="Optional"
          value={values.billingAddress}
        />
      </div>
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
