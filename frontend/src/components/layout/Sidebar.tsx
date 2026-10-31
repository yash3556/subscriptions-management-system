import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Percent,
  ShoppingBag,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  { label: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
  { label: "Customers", path: "/app/customers", icon: Users },
  { label: "Products", path: "/app/products", icon: Package },
  { label: "Subscription Plans", path: "/app/plans", icon: ClipboardList },
  { label: "Quotations", path: "/app/quotations", icon: FileText },
  { label: "Subscriptions", path: "/app/subscriptions", icon: ShoppingBag },
  { label: "Invoices", path: "/app/invoices", icon: FileText },
  { label: "Payments", path: "/app/payments", icon: CreditCard },
  { label: "Discounts", path: "/app/discounts", icon: Percent },
  { label: "Reports", path: "/app/reports", icon: BarChart3 },
  { label: "Staff Management", path: "/app/staff", icon: UserCog },
];

interface SidebarProps {
  isOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <NavLink
          className="text-lg font-semibold tracking-tight text-slate-900"
          onClick={onNavigate}
          to="/app/dashboard"
        >
          Brightloop
        </NavLink>
        <button
          aria-label="Close navigation menu"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          onClick={onNavigate}
          type="button"
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
            onClick={onNavigate}
            to={path}
          >
            <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}