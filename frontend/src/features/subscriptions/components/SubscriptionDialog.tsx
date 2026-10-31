import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { SubscriptionForm } from "./SubscriptionForm";
import type { SubscriptionFormValues, SubscriptionRecord } from "../types";

interface SubscriptionDialogProps {
  subscription?: SubscriptionRecord;
  notice?: string;
  onClose: () => void;
  onSubmit: (values: SubscriptionFormValues) => void;
}

export function SubscriptionDialog({
  subscription,
  notice,
  onClose,
  onSubmit,
}: SubscriptionDialogProps) {
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
      aria-labelledby="subscription-dialog-title"
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold" id="subscription-dialog-title">
            {subscription ? "Edit subscription" : "Create subscription"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Set customer, plan, dates, payment terms, and subscription lines.
          </p>
        </div>
        <button
          aria-label="Close subscription form"
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
        <SubscriptionForm
          initialSubscription={subscription}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </dialog>
  );
}
