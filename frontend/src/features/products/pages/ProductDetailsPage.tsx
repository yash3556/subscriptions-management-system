import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { businessService, getBusinessErrorMessage, type BusinessRecord } from "../../../services/businessService";
import { ProductDetails } from "../components/ProductDetails";
import type { ProductRecord } from "../types";

function mapProduct(record: BusinessRecord): ProductRecord {
  const variants = Array.isArray(record.variants) ? record.variants : [];
  return {
    id: record.id,
    name: String(record.name ?? ""),
    type: String(record.product_type ?? ""),
    salesPrice: Number(record.sales_price_paise ?? 0) / 100,
    costPrice: Number(record.cost_price_paise ?? 0) / 100,
    taxRateBps: Number(record.tax_rate_bps ?? 0),
    isActive: record.is_active !== false,
    notes: typeof record.notes === "string" ? record.notes : "",
    variants: variants.flatMap((raw) => {
      if (typeof raw !== "object" || raw === null) return [];
      const variant = raw as Record<string, unknown>;
      return [{ attribute: "Variant", value: String(variant.name ?? ""), additionalPrice: Number(variant.price_adjustment_paise ?? 0) / 100 }];
    }),
  };
}

export function ProductDetailsPage() {
  const { productId = "" } = useParams();
  const [product, setProduct] = useState<ProductRecord>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setProduct(mapProduct(await businessService.products.get(productId))); }
    catch (reason) { setError(getBusinessErrorMessage(reason)); }
    finally { setLoading(false); }
  }, [productId]);
  useEffect(() => { void refresh(); }, [refresh]);
  return (
    <section aria-labelledby="product-detail-title" className="mx-auto w-full max-w-5xl">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700" to="/app/products"><ArrowLeft aria-hidden="true" size={17} />Back to products</Link>
      <h1 className="mb-5 text-2xl font-semibold tracking-tight text-slate-900" id="product-detail-title">Product details</h1>
      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}<button className="ml-3 underline" onClick={() => void refresh()} type="button">Retry</button></p>}
      {loading ? <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading product…</p> : <ProductDetails product={product} />}
    </section>
  );
}
