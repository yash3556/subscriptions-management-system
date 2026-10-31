import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { BusinessRecord } from "../../../services/businessService";
import type { QuotationFormValues, QuotationLine, QuotationRecord } from "../types";

interface QuotationFormProps {
  customers: BusinessRecord[];
  products: BusinessRecord[];
  plans: BusinessRecord[];
  initialQuotation?: QuotationRecord;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: QuotationFormValues) => void | Promise<void>;
}

export function QuotationForm({
  customers,
  products,
  plans,
  initialQuotation,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: QuotationFormProps) {
  const [values, setValues] = useState<QuotationFormValues>(() => initialQuotation ? {
    customerId: initialQuotation.customerId,
    validityDays: initialQuotation.validityDays,
    notes: initialQuotation.notes,
    lines: initialQuotation.lines.map((line) => ({ ...line })),
  } : { customerId: "", validityDays: "14", notes: "", lines: [{ type: "product", itemId: "", variantId: "", quantity: "1" }] });
  const [submitted, setSubmitted] = useState(false);

  function updateLine(index: number, patch: Partial<QuotationLine>) {
    setValues((current) => ({ ...current, lines: current.lines.map((line, i) => i === index ? { ...line, ...patch } : line) }));
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (isSubmitting || !values.customerId || !/^[1-9]\d*$/.test(values.validityDays) ||
      Number(values.validityDays) > 90 || !values.lines.length ||
      values.lines.some((line) => !line.itemId || !/^[1-9]\d*$/.test(line.quantity) ||
        (line.type === "product" && products.some((product) => product.id === line.itemId) === false))) return;
    void onSubmit(values);
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Customer</span>
        <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" disabled={Boolean(initialQuotation) || isSubmitting} onChange={(event) => setValues((v) => ({ ...v, customerId: event.target.value }))} value={values.customerId}>
          <option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{String(customer.name ?? customer.email ?? customer.id)}</option>)}
        </select>
        {submitted && !values.customerId && <span className="mt-1 block text-sm text-red-700">Select a customer.</span>}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Valid for (days)</span><input className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" max="90" min="1" onChange={(event) => setValues((v) => ({ ...v, validityDays: event.target.value }))} type="number" value={values.validityDays} />{submitted && (!/^[1-9]\d*$/.test(values.validityDays) || Number(values.validityDays) > 90) && <span className="mt-1 block text-sm text-red-700">Enter 1–90 days.</span>}</label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">Notes</span><input className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" maxLength={2000} onChange={(event) => setValues((v) => ({ ...v, notes: event.target.value }))} value={values.notes} /></label>
      </div>
      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">Items and quantities</legend>
        {values.lines.map((line, index) => {
          const source = line.type === "product" ? products : plans;
          const variants = source.find((item) => item.id === line.itemId)?.variants;
          const variantList = Array.isArray(variants) ? variants.filter((variant): variant is Record<string, unknown> => typeof variant === "object" && variant !== null && variant.is_active !== false) : [];
          return <div className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-[9rem_1fr_1fr_6rem_auto]" key={index}>
            <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Type</span><select className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" disabled={isSubmitting} onChange={(event) => updateLine(index, { type: event.target.value as QuotationLine["type"], itemId: "", variantId: "" })} value={line.type}><option value="product">Product</option><option value="plan">Plan</option></select></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Item</span><select className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" disabled={isSubmitting} onChange={(event) => updateLine(index, { itemId: event.target.value, variantId: "" })} value={line.itemId}><option value="">Select {line.type}</option>{source.map((item) => <option key={item.id} value={item.id}>{String(item.name ?? item.id)}</option>)}</select></label>
            {line.type === "product" ? <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Variant</span><select className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" disabled={isSubmitting || variantList.length === 0} onChange={(event) => updateLine(index, { variantId: event.target.value })} value={line.variantId}><option value="">Standard</option>{variantList.map((variant) => <option key={String(variant.id)} value={String(variant.id)}>{String(variant.name)}</option>)}</select></label> : <span />}
            <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Quantity</span><input className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" min="1" onChange={(event) => updateLine(index, { quantity: event.target.value })} type="number" value={line.quantity} /></label>
            <button aria-label={`Remove item ${index + 1}`} className="mt-5 rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700" disabled={isSubmitting || values.lines.length === 1} onClick={() => setValues((current) => ({ ...current, lines: current.lines.filter((_, i) => i !== index) }))} type="button"><Trash2 aria-hidden="true" size={17} /></button>
          </div>;
        })}
        <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium" disabled={isSubmitting} onClick={() => setValues((v) => ({ ...v, lines: [...v.lines, { type: "product", itemId: "", variantId: "", quantity: "1" }] }))} type="button"><Plus aria-hidden="true" size={16} /> Add item</button>
      </fieldset>
      <p className="text-xs text-slate-500">Prices and product tax rates are calculated by the server. Quotation templates and manual discount/tax overrides are not provided by the API.</p>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button className="rounded-md border border-slate-300 px-4 py-2.5 text-sm" disabled={isSubmitting} onClick={onCancel} type="button">Cancel</button>
        <button className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving…" : initialQuotation ? "Save changes" : "Create quotation"}</button>
      </div>
    </form>
  );
}
