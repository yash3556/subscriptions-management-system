import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ProductRecord } from "../types";

interface ProductDeleteDialogProps {
  product: ProductRecord;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProductDeleteDialog({
  product,
  isDeleting = false,
  onClose,
  onConfirm,
}: ProductDeleteDialogProps) {
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
      aria-labelledby="delete-product-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <h2
            className="text-lg font-semibold text-slate-900"
            id="delete-product-title"
          >
            Delete product?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The product will be deactivated and will no longer be available for
            new quotations.
          </p>
        </div>
        <button
          aria-label="Close delete dialog"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700"
          onClick={onClose}
          disabled={isDeleting}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="border-t border-slate-200 px-5 py-4">
        <p className="text-sm font-medium text-slate-900">{product.name}</p>
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            onClick={onConfirm}
            disabled={isDeleting}
            type="button"
          >
            {isDeleting ? "Deactivating…" : "Deactivate product"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
