import { FileText } from "lucide-react";

export function PortalInvoicesPage() {
  return (
    <section
      aria-labelledby="portal-invoices-title"
      className="mx-auto max-w-5xl"
    >
      <h1
        className="text-2xl font-semibold tracking-tight text-slate-900"
        id="portal-invoices-title"
      >
        My Invoices
      </h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Review invoices and payment status associated with your account.
      </p>
      <div className="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-14 text-center">
        <span className="mb-3 inline-flex rounded-full bg-slate-100 p-3 text-slate-500">
          <FileText aria-hidden="true" size={22} />
        </span>
        <p className="font-medium text-slate-900">No invoice data loaded</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-600">
          Invoice and payment information will appear after customer sign-in,
          ownership enforcement, and backend integration are available.
        </p>
      </div>
    </section>
  );
}
