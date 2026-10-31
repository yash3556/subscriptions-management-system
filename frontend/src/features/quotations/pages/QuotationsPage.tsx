import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import {
  businessService,
  getBusinessErrorMessage,
  type BusinessRecord,
} from "../../../services/businessService";
import { QuotationDialog } from "../components/QuotationDialog";
import { QuotationTable } from "../components/QuotationTable";
import type { QuotationFormValues, QuotationRecord } from "../types";

function mapQuote(record: BusinessRecord, customers: BusinessRecord[]): QuotationRecord {
  const lines = Array.isArray(record.lines) ? record.lines : [];
  const customerId = typeof record.customer_id === "string" ? record.customer_id : "";
  const customer = customers.find((item) => item.id === customerId);
  return {
    id: record.id,
    number: typeof record.number === "string" ? record.number : record.id,
    customerId,
    customerName: typeof customer?.name === "string" ? customer.name : customerId,
    validityDays: String(record.validity_days ?? 14),
    validUntil: typeof record.valid_until === "string" ? record.valid_until : "",
    notes: typeof record.notes === "string" ? record.notes : "",
    status: typeof record.status === "string" ? record.status : "quotation",
    totalPaise: typeof record.total_paise === "number" ? record.total_paise : 0,
    sentAt: typeof record.sent_at === "string" ? record.sent_at : undefined,
    customerAcceptedAt: typeof record.customer_accepted_at === "string" ? record.customer_accepted_at : undefined,
    lines: lines.flatMap((raw) => {
      if (typeof raw !== "object" || raw === null) return [];
      const line = raw as Record<string, unknown>;
      const productId = typeof line.product_id === "string" ? line.product_id : "";
      const planId = typeof line.plan_id === "string" ? line.plan_id : "";
      if (!productId && !planId) return [];
      return [{
        type: productId ? "product" as const : "plan" as const,
        itemId: productId || planId,
        variantId: typeof line.variant_id === "string" ? line.variant_id : "",
        quantity: String(line.quantity ?? 1),
      }];
    }),
  };
}

export function QuotationsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [customers, setCustomers] = useState<BusinessRecord[]>([]);
  const [products, setProducts] = useState<BusinessRecord[]>([]);
  const [plans, setPlans] = useState<BusinessRecord[]>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuotationRecord | undefined>();
  const [busyId, setBusyId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canWrite =
    user?.role === "ADMIN" ||
    (user?.role === "INTERNAL_STAFF" && user.permissions.includes("quotations:write"));
  const canReadCustomers = user?.role === "ADMIN" || Boolean(user?.permissions.includes("customers:read"));
  const canReadProducts = user?.role === "ADMIN" || Boolean(user?.permissions.includes("products:read"));
  const canReadPlans = user?.role === "ADMIN" || Boolean(user?.permissions.includes("plans:read"));
  const canEdit = canWrite && canReadCustomers && canReadProducts && canReadPlans;
  const quotations = useMemo(
    () => records.map((record) => mapQuote(record, customers)).filter((quote) =>
      !search || `${quote.number} ${quote.customerName}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
    ),
    [customers, records, search],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [quoteRows, customerRows, productRows, planRows] = await Promise.all([
        businessService.quotations.list(),
        canReadCustomers ? businessService.customers.list() : Promise.resolve({ items: [] as BusinessRecord[], page: 1, page_size: 100 }),
        canReadProducts ? businessService.products.list() : Promise.resolve({ items: [] as BusinessRecord[], page: 1, page_size: 100 }),
        canReadPlans ? businessService.plans.list() : Promise.resolve({ items: [] as BusinessRecord[], page: 1, page_size: 100 }),
      ]);
      setRecords(quoteRows.items);
      setCustomers(customerRows.items);
      setProducts(productRows.items);
      setPlans(planRows.items);
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [canReadCustomers, canReadPlans, canReadProducts]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(values: QuotationFormValues) {
    setIsSaving(true);
    setError("");
    setNotice("");
    const payload = {
      customer_id: values.customerId,
      validity_days: Number(values.validityDays),
      notes: values.notes.trim() || null,
      lines: values.lines.map((line) => ({
        ...(line.type === "product"
          ? { product_id: line.itemId, ...(line.variantId ? { variant_id: line.variantId } : {}) }
          : { plan_id: line.itemId }),
        quantity: Number(line.quantity),
      })),
    };
    try {
      if (selectedQuote) {
        await businessService.quotations.update(selectedQuote.id, {
          validity_days: payload.validity_days,
          notes: payload.notes,
          lines: payload.lines,
        });
        setNotice("Quotation updated.");
      } else {
        await businessService.quotations.create(payload);
        setNotice("Quotation created.");
      }
      setFormOpen(false);
      setSelectedQuote(undefined);
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setIsSaving(false);
    }
  }

  async function runAction(quote: QuotationRecord, operation: "send" | "delete" | "confirm") {
    if (operation === "delete" && !window.confirm(`Delete quotation ${quote.number}?`)) return;
    setBusyId(quote.id);
    setError("");
    setNotice("");
    try {
      if (operation === "send") {
        await businessService.quotations.send(quote.id);
        setNotice("Quotation marked as sent. The API does not send email.");
      } else if (operation === "delete") {
        await businessService.quotations.remove(quote.id);
        setNotice("Quotation deleted.");
      } else {
        await businessService.quotations.confirm(quote.id);
        setNotice("Accepted quotation converted to a subscription.");
      }
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setBusyId("");
    }
  }

  return (
    <section aria-labelledby="quotations-title" className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="quotations-title">Quotations</h1><p className="mt-1 text-sm leading-6 text-slate-600">Create offers, track customer responses, and convert accepted quotations.</p></div>
        {canEdit && <button className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => { setSelectedQuote(undefined); setFormOpen(true); }} type="button"><Plus aria-hidden="true" size={18} /> Create quotation</button>}
      </div>
      <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Quotation prices and tax are calculated from catalog records. The current API does not provide templates or discount/tax override fields.</p>
      {(error || notice) && <p className={`mt-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block w-full sm:max-w-sm"><span className="mb-1.5 block text-sm font-medium text-slate-700">Search quotations</span><input className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" onChange={(event) => setSearch(event.target.value)} value={search} /></label>
      </div>
      <div className="mt-4">
        {loading ? <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading quotations…</p> : <QuotationTable
          busyId={busyId}
          canWrite={canWrite}
          canEdit={canEdit}
          onConfirm={(quote) => void runAction(quote, "confirm")}
          onDelete={(quote) => void runAction(quote, "delete")}
          onEdit={(quote) => { setSelectedQuote(quote); setFormOpen(true); }}
          onSend={(quote) => void runAction(quote, "send")}
          quotations={quotations}
        />}
      </div>
      {formOpen && <QuotationDialog
        customers={customers}
        isSubmitting={isSaving}
        notice={error}
        onClose={() => { if (!isSaving) { setFormOpen(false); setSelectedQuote(undefined); setError(""); } }}
        onSubmit={submit}
        plans={plans}
        products={products}
        quotation={selectedQuote}
      />}
    </section>
  );
}
