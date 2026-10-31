import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { QuotationForm } from "./QuotationForm";
import type { QuotationFormValues, QuotationRecord } from "../types";

interface QuotationDialogProps {
  quotation?: QuotationRecord;
  notice?: string;
  onClose: () => void;
  onSubmit: (values: QuotationFormValues) => void;
}

export function QuotationDialog({
  quotation,
  notice,
  onClose,
  onSubmit,
}: QuotationDialogProps) {
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
      aria-labelledby="quotation-dialog-title"
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold" id="quotation-dialog-title">
            Create quotation
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Start with a quotation template and its product or plan lines.
          </p>
        </div>
        <button
          aria-label="Close quotation form"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
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
        <QuotationForm
          initialQuotation={quotation}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </dialog>
  );
}
