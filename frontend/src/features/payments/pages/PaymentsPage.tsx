import { useState } from "react";
import { Plus } from "lucide-react";
import { PaymentDialog } from "../components/PaymentDialog";
import { PaymentTable } from "../components/PaymentTable";
import type { PaymentFormValues, PaymentRecord } from "../types";

const payments: PaymentRecord[] = [];

export function PaymentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");

  function handleSubmit(_values: PaymentFormValues) {
    setNotice(
      "Payment recording is unavailable until backend integration. No payment was saved.",
    );
  }

  return (
    <section
      aria-labelledby="payments-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-slate-900"
            id="payments-title"
          >
            Payments
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Record payments against invoices and review payment history.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          onClick={() => {
            setNotice("");
            setDialogOpen(true);
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Record payment
        </button>
      </div>
      {notice && (
        <p
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
          role="status"
        >
          {notice}
        </p>
      )}
      <div className="mt-6">
        <PaymentTable payments={payments} />
      </div>
      <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Invoice balances</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Paid, outstanding, and overdue invoice balances will be shown when
          invoice and payment data are connected.
        </p>
      </div>
      {dialogOpen && (
        <PaymentDialog
          notice={notice}
          onClose={() => {
            setDialogOpen(false);
            setNotice("");
          }}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}
