import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";
import { DiscountDialog } from "../components/DiscountDialog";
import { DiscountTable } from "../components/DiscountTable";
import type { DiscountFormValues, DiscountRecord } from "../types";

function mapDiscount(record: BusinessRecord, products: BusinessRecord[]): DiscountRecord {
  const productIds = Array.isArray(record.product_ids) ? record.product_ids.map(String) : [];
  const type = record.discount_type === "percentage" ? "percentage" : "fixed";
  return {
    id: record.id,
    name: String(record.name ?? ""),
    type,
    value: type === "fixed" ? Number(record.value ?? 0) / 100 : Number(record.value ?? 0) / 100,
    minimumPurchase: Number(record.minimum_amount_paise ?? 0) / 100,
    minimumQuantity: Number(record.minimum_quantity ?? 1),
    startsAt: typeof record.starts_at === "string" ? record.starts_at.slice(0, 10) : "",
    endsAt: typeof record.ends_at === "string" ? record.ends_at.slice(0, 10) : "",
    usageLimit: typeof record.usage_limit === "number" ? record.usage_limit : undefined,
    target: productIds.length > 0 || !record.applies_to_subscription ? "products" : "subscriptions",
    eligibleProducts: productIds.map((id) => {
      const product = products.find((item) => item.id === id);
      return typeof product?.name === "string" ? product.name : id;
    }),
    eligibleProductIds: productIds,
    isActive: record.is_active === true,
    usedCount: Number(record.usage_count ?? 0),
  };
}

export function DiscountsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [products, setProducts] = useState<BusinessRecord[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountRecord | undefined>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isAdmin = user?.role === "ADMIN";
  const discounts = useMemo(() => records.map((record) => mapDiscount(record, products)).filter((item) =>
    !search || item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  ), [products, records, search]);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [discountRows, productRows] = await Promise.all([
        businessService.discounts.list(),
        isAdmin ? businessService.products.list() : Promise.resolve({ items: [] as BusinessRecord[], page: 1, page_size: 100 }),
      ]);
      setRecords(discountRows.items);
      setProducts(productRows.items);
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setLoading(false); }
  }, [isAdmin]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(values: DiscountFormValues) {
    setBusy(true); setError(""); setNotice("");
    const type = values.type;
    const productIds = values.target === "products" ? values.eligibleProducts.filter(Boolean) : [];
    const payload = {
      name: values.name.trim(),
      discount_type: type,
      value: Math.round(Number(values.value) * 100),
      minimum_amount_paise: values.minimumPurchase ? Math.round(Number(values.minimumPurchase) * 100) : 0,
      minimum_quantity: values.minimumQuantity ? Number(values.minimumQuantity) : 1,
      starts_at: new Date(`${values.startsAt}T00:00:00Z`).toISOString(),
      ends_at: values.endsAt ? new Date(`${values.endsAt}T23:59:59Z`).toISOString() : null,
      usage_limit: values.usageLimit ? Number(values.usageLimit) : null,
      product_ids: productIds,
      applies_to_subscription: values.target === "subscriptions",
    };
    try {
      if (selectedDiscount) {
        await businessService.discounts.update(selectedDiscount.id, payload);
        setNotice("Discount updated.");
      } else {
        await businessService.discounts.create(payload);
        setNotice("Discount created.");
      }
      setDialogOpen(false); setSelectedDiscount(undefined);
      await refresh();
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setBusy(false); }
  }

  async function deactivate(discount: DiscountRecord) {
    if (!window.confirm(`Disable discount "${discount.name}"?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await businessService.discounts.deactivate(discount.id);
      setNotice("Discount disabled.");
      await refresh();
    } catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="discounts-title" className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="discounts-title">Discounts</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Manage fixed and percentage rules and their eligibility.</p></div>{isAdmin && <button className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => { setSelectedDiscount(undefined); setDialogOpen(true); setError(""); }} type="button"><Plus aria-hidden="true" size={18} />Create discount</button>}</div>
      <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Discount rules are saved and managed here, but the current quotation and invoice APIs do not accept or apply discount rules to their totals.</p>
      {(error || notice) && <p className={`mt-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>{error || notice}{error && <button className="ml-3 underline" onClick={() => void refresh()} type="button">Retry</button>}</p>}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4"><label className="block w-full sm:max-w-sm"><span className="mb-1.5 block text-sm font-medium text-slate-700">Search discount rules</span><input className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" onChange={(event) => setSearch(event.target.value)} value={search} /></label></div>
      <div className="mt-4">{loading ? <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading discounts…</p> : <DiscountTable discounts={discounts} onDeactivate={(discount) => void deactivate(discount)} onEdit={(discount) => { setSelectedDiscount(discount); setDialogOpen(true); setError(""); }} />}</div>
      {dialogOpen && <DiscountDialog discount={selectedDiscount} isSubmitting={busy} notice={error} onClose={() => { if (!busy) { setDialogOpen(false); setSelectedDiscount(undefined); setError(""); } }} onSubmit={submit} products={products} />}
    </section>
  );
}
