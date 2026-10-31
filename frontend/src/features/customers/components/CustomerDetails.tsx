import { Building2, CreditCard, Mail, Phone } from "lucide-react";
import type { CustomerDetailsRecord } from "../types";

interface CustomerDetailsProps {
  customer?: CustomerDetailsRecord;
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string;
  icon: typeof Mail;
}) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden="true" className="mt-0.5 shrink-0 text-slate-400" size={18} />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <dd className="mt-1 wrap-break-words text-sm text-slate-900">
          {value || "Not provided"}
        </dd>
      </div>
    </div>
  );
}

export function CustomerDetails({ customer }: CustomerDetailsProps) {
  if (!customer) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Customer details unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Customer records are not connected yet. Details will be shown here
          after backend integration.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Customer information
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <Detail icon={Building2} label="Customer name" value={customer.name} />
          <Detail icon={Mail} label="Email" value={customer.email} />
          <Detail icon={Phone} label="Phone" value={customer.phone} />
          <Detail
            icon={CreditCard}
            label="Billing address"
            value={customer.billingAddress}
          />
        </dl>
      </section>
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900">Subscriptions</h2>
        <p className="mt-1 text-sm text-slate-600">
          Subscription details will be available when the related API is
          connected.
        </p>
      </section>
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-5 sm:p-6">
        <h2 className="font-semibold text-slate-900">Invoices</h2>
        <p className="mt-1 text-sm text-slate-600">
          Invoice details will be available when the related API is connected.
        </p>
      </section>
    </div>
  );
}
