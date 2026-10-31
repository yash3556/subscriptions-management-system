import { CircleDollarSign, Package, Tags } from "lucide-react";
import type { ProductRecord } from "../types";

interface ProductDetailsProps {
  product?: ProductRecord;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

export function ProductDetails({ product }: ProductDetailsProps) {
  if (!product) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Product details unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Product details are not available in this navigation state. Product
          records will be connected after backend integration.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Product information
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3">
            <Package
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-slate-400"
              size={18}
            />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Product name
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{product.name}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <Tags
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-slate-400"
              size={18}
            />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Product type
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{product.type}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <CircleDollarSign
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-slate-400"
              size={18}
            />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sales price
              </dt>
              <dd className="mt-1 text-sm tabular-nums text-slate-900">
                {formatPrice(product.salesPrice)}
              </dd>
            </div>
          </div>
          <div className="flex gap-3">
            <CircleDollarSign
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-slate-400"
              size={18}
            />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cost price
              </dt>
              <dd className="mt-1 text-sm tabular-nums text-slate-900">
                {formatPrice(product.costPrice)}
              </dd>
            </div>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Notes
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-900">
              {product.notes || "No notes"}
            </dd>
          </div>
        </dl>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900">Variants</h2>
        {product.variants.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No variants.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-105 text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2 pr-4" scope="col">
                    Attribute
                  </th>
                  <th className="pb-2 pr-4" scope="col">
                    Value
                  </th>
                  <th className="pb-2 text-right" scope="col">
                    Additional price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.variants.map((variant, index) => (
                  <tr key={`${variant.attribute}-${variant.value}-${index}`}>
                    <td className="py-3 pr-4 text-slate-700">
                      {variant.attribute}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {variant.value}
                    </td>
                    <td className="py-3 text-right tabular-nums text-slate-900">
                      {formatPrice(variant.additionalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
