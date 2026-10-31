import { Link } from "react-router-dom";
import { FileText, Repeat } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

export function PortalOverviewPage() {
  const { user } = useAuth();

  return (
    <section
      aria-labelledby="portal-overview-title"
      className="mx-auto max-w-5xl"
    >
      <h1
        className="text-2xl font-semibold tracking-tight text-slate-900"
        id="portal-overview-title"
      >
        Account overview
      </h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Welcome, {user?.name}. View the areas available in your account.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <PortalLinkCard
          description="Review your subscription information."
          icon={Repeat}
          label="My Subscription"
          to="/portal/subscriptions"
        />
        <PortalLinkCard
          description="Review your invoices and payment status."
          icon={FileText}
          label="Invoices"
          to="/portal/invoices"
        />
      </div>
      <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="font-medium text-slate-900">Account records unavailable</p>
        <p className="mt-1 text-sm text-slate-600">
          Customer-specific subscription and invoice list APIs are not
          implemented in the backend yet, so no account records can be loaded.
        </p>
      </div>
    </section>
  );
}

function PortalLinkCard({
  icon: Icon,
  label,
  description,
  to,
}: {
  icon: typeof Repeat;
  label: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      to={to}
    >
      <span className="rounded-md bg-slate-100 p-2.5 text-slate-600">
        <Icon aria-hidden="true" size={19} />
      </span>
      <span>
        <span className="block font-medium text-slate-900">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-600">
          {description}
        </span>
      </span>
    </Link>
  );
}
