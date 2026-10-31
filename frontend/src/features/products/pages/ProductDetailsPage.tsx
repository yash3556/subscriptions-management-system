import { useLocation, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ProductDetails } from "../components/ProductDetails";
import type { ProductRecord } from "../types";

function isProductRecord(value: unknown): value is ProductRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "type" in value &&
    typeof value.type === "string" &&
    "salesPrice" in value &&
    typeof value.salesPrice === "number" &&
    "costPrice" in value &&
    typeof value.costPrice === "number" &&
    "variants" in value &&
    Array.isArray(value.variants)
  );
}

export function ProductDetailsPage() {
  const location = useLocation();
  const product = isProductRecord(location.state) ? location.state : undefined;

  return (
    <section
      aria-labelledby="product-detail-title"
      className="mx-auto w-full max-w-5xl"
    >
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        to="/app/products"
      >
        <ArrowLeft aria-hidden="true" size={17} />
        Back to products
      </Link>
      <div className="mb-5">
        <h1
          className="text-2xl font-semibold tracking-tight text-slate-900"
          id="product-detail-title"
        >
          Product details
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Product information, pricing, notes, and variants.
        </p>
      </div>
      <ProductDetails product={product} />
    </section>
  );
}
