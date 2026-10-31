import { NavLink, Outlet } from "react-router-dom";
import {
  FileText,
  LayoutDashboard,
  Repeat,
} from "lucide-react";

const links = [
  { label: "Overview", to: "/portal", icon: LayoutDashboard, end: true },
  { label: "My Subscription", to: "/portal/subscriptions", icon: Repeat },
  { label: "Invoices", to: "/portal/invoices", icon: FileText },
];

export function PortalLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center px-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Brightloop
          </span>
          <span className="ml-3 border-l border-slate-200 pl-3 text-sm text-slate-500">
            Customer portal
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <nav
          aria-label="Customer portal navigation"
          className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2"
        >
          {links.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              end={end}
              key={to}
              className={({ isActive }) =>
                `inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
              to={to}
            >
              <Icon aria-hidden="true" size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <p
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          role="status"
        >
          Customer sign-in and ownership checks are not connected yet. No
          customer-specific records are loaded in this portal.
        </p>
        <main className="py-5 sm:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
