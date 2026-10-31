import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { PaymentForm } from "./PaymentForm";
import type { PaymentFormValues } from "../types";

interface PaymentDialogProps {
  notice?: string;
  onClose: () => void;
  onSubmit: (values: PaymentFormValues) => void;
}

export function PaymentDialog({
  notice,
  onClose,
  onSubmit,
}: PaymentDialogProps) {
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
      aria-labelledby="payment-dialog-title"
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold" id="payment-dialog-title">
            Record payment
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Record a payment against its invoice.
          </p>
        </div>
        <button
          aria-label="Close payment form"
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
        <PaymentForm onCancel={onClose} onSubmit={onSubmit} />
      </div>
    </dialog>
  );
}
