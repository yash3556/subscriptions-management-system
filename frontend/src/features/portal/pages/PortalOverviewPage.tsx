import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, FileText, Repeat } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { businessService, getBusinessErrorMessage } from "../../../services/businessService";

export function PortalOverviewPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ subscriptions: 0, invoices: 0, quotations: 0, payments: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const customer = await businessService.customers.me();
        const customerId = customer.id;
        const [subscriptions, invoices, quotations, payments] = await Promise.all([
          businessService.customers.subscriptions(customerId),
          businessService.customers.invoices(customerId),
          businessService.customers.quotations(customerId),
          businessService.customers.payments(customerId),
        ]);
        if (active) setCounts({
          subscriptions: subscriptions.items.length,
          invoices: invoices.items.length,
          quotations: quotations.items.length,
          payments: payments.items.length,
        });
      } catch (reason) {
        if (active) setError(getBusinessErrorMessage(reason));
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="portal-overview-title" className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="portal-overview-title">Account overview</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">Welcome, {user?.name}. View the records associated with your account.</p>
      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <PortalLinkCard count={counts.subscriptions} description="Review your subscription information." icon={Repeat} label="My Subscriptions" to="/portal/subscriptions" />
        <PortalLinkCard count={counts.invoices} description="Review invoices and payment status." icon={FileText} label="Invoices" to="/portal/invoices" />
        <PortalLinkCard count={counts.quotations} description="Review, accept, or reject your quotations." icon={FileText} label="Quotations" to="/portal/quotations" />
        <PortalLinkCard count={counts.payments} description="See recorded payments associated with your invoices." icon={CreditCard} label="Payments" to="/portal/payments" />
      </div>
    </section>
  );
}

function PortalLinkCard({
  icon: Icon,
  label,
  description,
  to,
  count,
}: {
  icon: typeof Repeat | typeof CreditCard | typeof FileText;
  label: string;
  description: string;
  to: string;
  count: number;
}) {
  return (
    <Link className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 hover:bg-slate-50" to={to}>
      <span className="rounded-md bg-slate-100 p-2.5 text-slate-600"><Icon aria-hidden="true" size={19} /></span>
      <span>
        <span className="block font-medium text-slate-900">{label} <span className="ml-1 text-slate-500">({count})</span></span>
        <span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span>
      </span>
    </Link>
  );
}
