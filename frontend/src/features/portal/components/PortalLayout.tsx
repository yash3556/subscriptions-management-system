import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Repeat,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

const links = [
  { label: "Overview", to: "/portal", icon: LayoutDashboard, end: true },
  { label: "My Subscription", to: "/portal/subscriptions", icon: Repeat },
  { label: "Invoices", to: "/portal/invoices", icon: FileText },
];

export function PortalLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState("");

  async function handleSignOut() {
    setLogoutError("");
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError(
        "You were signed out on this device, but the server session could not be revoked.",
      );
    }
  }

  return (
    <div className="portal-shell min-h-screen bg-slate-50">
      <header className="portal-header border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center">
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Brightloop
            </span>
            <span className="ml-3 hidden border-l border-slate-200 pl-3 text-sm text-slate-500 sm:inline">
              Customer portal
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {user?.name && (
              <span className="hidden max-w-40 truncate text-sm text-slate-600 sm:inline">
                {user.name}
              </span>
            )}
            <button
              aria-label="Sign out"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              onClick={() => void handleSignOut()}
              type="button"
            >
              <LogOut aria-hidden="true" size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <nav
          aria-label="Customer portal navigation"
          className="portal-navigation flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2"
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
        {logoutError && (
          <p
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {logoutError}
          </p>
        )}
        <main className="py-5 sm:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
