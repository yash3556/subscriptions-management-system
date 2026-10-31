import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProductDeleteDialog } from "../components/ProductDeleteDialog";
import { ProductFormDialog } from "../components/ProductFormDialog";
import { ProductSearch } from "../components/ProductSearch";
import { ProductTable } from "../components/ProductTable";
import type { ProductFormValues, ProductRecord } from "../types";

const products: ProductRecord[] = [];

export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(
    null,
  );
  const [deleteProduct, setDeleteProduct] = useState<ProductRecord | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      product.name.toLocaleLowerCase().includes(query),
    );
  }, [search]);

  function handleSubmit(_values: ProductFormValues) {
    setNotice(
      `Product ${
        formMode === "edit" ? "updates" : "creation"
      } are unavailable until backend integration. No product was saved.`,
    );
  }

  return (
    <section
      aria-labelledby="products-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-slate-900"
            id="products-title"
          >
            Products
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Manage product information, pricing, notes, and variants.
          </p>
        </div>
        <button
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          onClick={() => {
            setNotice("");
            setSelectedProduct(null);
            setFormMode("add");
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Add product
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <ProductSearch onChange={setSearch} value={search} />
      </div>
      <div className="mt-4">
        <ProductTable
          onDelete={setDeleteProduct}
          onEdit={(product) => {
            setNotice("");
            setSelectedProduct(product);
            setFormMode("edit");
          }}
          onView={(product) =>
            navigate("/app/products/details", { state: product })
          }
          products={filteredProducts}
        />
      </div>

      {formMode && (
        <ProductFormDialog
          notice={notice}
          onClose={() => {
            setFormMode(null);
            setSelectedProduct(null);
            setNotice("");
          }}
          onSubmit={handleSubmit}
          product={selectedProduct ?? undefined}
          submitLabel={formMode === "add" ? "Save product" : "Save changes"}
          title={formMode === "add" ? "Add product" : "Edit product"}
        />
      )}
      {deleteProduct && (
        <ProductDeleteDialog
          onClose={() => setDeleteProduct(null)}
          onConfirm={() => setDeleteProduct(null)}
          product={deleteProduct}
        />
      )}
    </section>
  );
}
