import { PackageOpen } from "lucide-react";
import type { ProductRecord } from "../types";
import { ProductActions } from "./ProductActions";

interface ProductTableProps {
  products: ProductRecord[];
  onView: (product: ProductRecord) => void;
  onEdit: (product: ProductRecord) => void;
  onDelete: (product: ProductRecord) => void;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

export function ProductTable({
  products,
  onView,
  onEdit,
  onDelete,
}: ProductTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-190 border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3.5" scope="col">
                Product name
              </th>
              <th className="px-5 py-3.5" scope="col">
                Type
              </th>
              <th className="px-5 py-3.5 text-right" scope="col">
                Sales price
              </th>
              <th className="px-5 py-3.5 text-right" scope="col">
                Cost price
              </th>
              <th className="px-5 py-3.5 text-center" scope="col">
                Variants
              </th>
              <th className="px-5 py-3.5" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product, index) => (
              <tr
                className="text-slate-700 hover:bg-slate-50"
                key={`${product.name}-${index}`}
              >
                <th
                  className="whitespace-nowrap px-5 py-4 font-medium text-slate-900"
                  scope="row"
                >
                  {product.name}
                </th>
                <td className="whitespace-nowrap px-5 py-4">{product.type}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                  {formatPrice(product.salesPrice)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                  {formatPrice(product.costPrice)}
                </td>
                <td className="px-5 py-4 text-center tabular-nums">
                  {product.variants.length}
                </td>
                <td className="px-5 py-3">
                  <ProductActions
                    onDelete={() => onDelete(product)}
                    onEdit={() => onEdit(product)}
                    onView={() => onView(product)}
                  />
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td className="px-5 py-14 text-center" colSpan={6}>
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                      <PackageOpen aria-hidden="true" size={22} />
                    </span>
                    <p className="font-medium text-slate-900">
                      No product records available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Products will appear here when product data is connected.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
