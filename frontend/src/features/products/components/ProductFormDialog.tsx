import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ProductForm } from "./ProductForm";
import type { ProductFormValues, ProductRecord } from "../types";

interface ProductFormDialogProps {
  title: string;
  submitLabel: string;
  product?: ProductRecord;
  notice?: string;
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => void;
}

export function ProductFormDialog({
  title,
  submitLabel,
  product,
  notice,
  onClose,
  onSubmit,
}: ProductFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      aria-labelledby="product-form-title"
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h2
            className="text-lg font-semibold text-slate-900"
            id="product-form-title"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter product information and optional variants.
          </p>
        </div>
        <button
          aria-label="Close form"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        {notice && (
          <p
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
            role="status"
          >
            {notice}
          </p>
        )}
        <ProductForm
          initialProduct={product}
          onCancel={onClose}
          onSubmit={onSubmit}
          submitLabel={submitLabel}
        />
      </div>
    </dialog>
  );
}
