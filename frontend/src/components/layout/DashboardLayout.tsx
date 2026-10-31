import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  customers: "Customers",
  products: "Products",
  plans: "Subscription Plans",
  quotations: "Quotations",
  subscriptions: "Subscriptions",
  invoices: "Invoices",
  payments: "Payments",
  discounts: "Discounts",
  reports: "Reports",
  staff: "Staff Management",
};

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const currentPage = location.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const pageTitle =
    currentPage === "details"
      ? location.pathname.includes("/products/")
        ? "Product details"
        : location.pathname.includes("/plans/")
          ? "Plan details"
          : location.pathname.includes("/subscriptions/")
            ? "Subscription details"
            : location.pathname.includes("/invoices/")
              ? "Invoice details"
              : "Customer details"
      : (pageTitles[currentPage] ?? "Workspace");

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {sidebarOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-slate-950/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      )}
      <Sidebar
        isOpen={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar
          pageTitle={pageTitle}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}