import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import {
  businessService,
  getBusinessErrorMessage,
  type BusinessRecord,
} from "../../../services/businessService";
import { ProductDeleteDialog } from "../components/ProductDeleteDialog";
import { ProductFormDialog } from "../components/ProductFormDialog";
import { ProductSearch } from "../components/ProductSearch";
import { ProductTable } from "../components/ProductTable";
import type { ProductFormValues, ProductRecord } from "../types";

function mapProduct(record: BusinessRecord): ProductRecord {
  const variants = Array.isArray(record.variants) ? record.variants : [];
  return {
    id: record.id,
    name: typeof record.name === "string" ? record.name : "",
    type: typeof record.product_type === "string" ? record.product_type : "",
    salesPrice: typeof record.sales_price_paise === "number" ? record.sales_price_paise / 100 : 0,
    costPrice: typeof record.cost_price_paise === "number" ? record.cost_price_paise / 100 : 0,
    taxRateBps: typeof record.tax_rate_bps === "number" ? record.tax_rate_bps : 0,
    isActive: record.is_active !== false,
    notes: typeof record.notes === "string" ? record.notes : "",
    variants: variants.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const variant = item as Record<string, unknown>;
      return [{
        attribute: "Variant",
        value: typeof variant.name === "string" ? variant.name : "",
        additionalPrice: typeof variant.price_adjustment_paise === "number" ? variant.price_adjustment_paise / 100 : 0,
      }];
    }),
  };
}

export function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductRecord | null>(null);
  const navigate = useNavigate();
  const canWrite =
    user?.role === "ADMIN" ||
    (user?.role === "INTERNAL_STAFF" && user.permissions.includes("products:write"));

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await businessService.products.list(search);
      setProducts(result.items.map(mapProduct));
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function handleSubmit(values: ProductFormValues) {
    if (!user) return;
    setIsSaving(true);
    setError("");
    setNotice("");
    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      product_type: values.type.trim(),
      sales_price_paise: Math.round(Number(values.salesPrice) * 100),
      tax_rate_bps: Math.round(Number(values.taxRate) * 100),
      notes: values.notes.trim() || null,
      variants: values.variants.map((variant) => ({
        name: variant.value.trim(),
        price_adjustment_paise: Math.round(Number(variant.additionalPrice) * 100),
        is_active: true,
      })),
    };
    if (user.role === "ADMIN") {
      payload.cost_price_paise = Math.round(Number(values.costPrice) * 100);
    }
    try {
      if (formMode === "edit" && selectedProduct) {
        await businessService.products.update(selectedProduct.id, payload);
        setNotice("Product updated.");
      } else {
        payload.cost_price_paise = Math.round(Number(values.costPrice) * 100);
        await businessService.products.create(payload);
        setNotice("Product created.");
      }
      setFormMode(null);
      setSelectedProduct(null);
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deleteProduct) return;
    setIsDeleting(true);
    setError("");
    try {
      await businessService.products.deactivate(deleteProduct.id);
      setNotice("Product deactivated.");
      setDeleteProduct(null);
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section aria-labelledby="products-title" className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="products-title">Products</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Manage product information, pricing, notes, and variants.</p>
        </div>
        {canWrite && (
          <button className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800" onClick={() => { setSelectedProduct(null); setFormMode("add"); }} type="button">
            <Plus aria-hidden="true" size={18} /> Add product
          </button>
        )}
      </div>
      {(error || notice) && <p className={`mt-4 rounded-md border px-3 py-2.5 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>{error || notice}</p>}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5"><ProductSearch onChange={setSearch} value={search} /></div>
      <div className="mt-4">
        {isLoading ? <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600" aria-live="polite">Loading products…</p> : (
          <ProductTable
            canWrite={canWrite}
            onDelete={setDeleteProduct}
            onEdit={(product) => { setSelectedProduct(product); setFormMode("edit"); }}
            onView={(product) => navigate(`/app/products/details/${product.id}`)}
            products={products}
          />
        )}
      </div>
      {formMode && <ProductFormDialog
        isSubmitting={isSaving}
        notice={error}
        onClose={() => { if (!isSaving) { setFormMode(null); setSelectedProduct(null); setError(""); } }}
        onSubmit={handleSubmit}
        product={selectedProduct ?? undefined}
        submitLabel={formMode === "add" ? "Save product" : "Save changes"}
        title={formMode === "add" ? "Add product" : "Edit product"}
      />}
      {deleteProduct && <ProductDeleteDialog isDeleting={isDeleting} onClose={() => { if (!isDeleting) setDeleteProduct(null); }} onConfirm={() => void handleDeactivate()} product={deleteProduct} />}
    </section>
  );
}
