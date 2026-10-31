import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { PlaceholderPage } from "../components/common/PlaceholderPage";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";
import { CustomerDetailsPage } from "../features/customers/pages/CustomerDetailsPage";
import { CustomersPage } from "../features/customers/pages/CustomersPage";
import { ProductDetailsPage } from "../features/products/pages/ProductDetailsPage";
import { ProductsPage } from "../features/products/pages/ProductsPage";
import { PlanDetailsPage } from "../features/plans/pages/PlanDetailsPage";
import { PlansPage } from "../features/plans/pages/PlansPage";
import { QuotationsPage } from "../features/quotations/pages/QuotationsPage";
import { SubscriptionsPage } from "../features/subscriptions/pages/SubscriptionsPage";
import { SubscriptionDetailsPage } from "../features/subscriptions/pages/SubscriptionDetailsPage";
import { InvoicesPage } from "../features/invoices/pages/InvoicesPage";
import { InvoiceDetailsPage } from "../features/invoices/pages/InvoiceDetailsPage";
import { PaymentsPage } from "../features/payments/pages/PaymentsPage";
import { DiscountsPage } from "../features/discounts/pages/DiscountsPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ReportsPage } from "../features/reports/pages/ReportsPage";
import { StaffPage } from "../features/staff/pages/StaffPage";
import { PortalLayout } from "../features/portal/components/PortalLayout";
import { PortalOverviewPage } from "../features/portal/pages/PortalOverviewPage";
import { PortalSubscriptionsPage } from "../features/portal/pages/PortalSubscriptionsPage";
import { PortalInvoicesPage } from "../features/portal/pages/PortalInvoicesPage";
import { RequireCustomer } from "../features/auth/components/RequireCustomer";
import {
  AccessDenied,
  RequireInternal,
} from "../features/auth/components/RequireInternal";

const appPages = [
  { path: "dashboard", title: "Dashboard" },
  { path: "customers", title: "Customers" },
  { path: "products", title: "Products" },
  { path: "plans", title: "Subscription Plans" },
  { path: "quotations", title: "Quotations" },
  { path: "subscriptions", title: "Subscriptions" },
  { path: "invoices", title: "Invoices" },
  { path: "payments", title: "Payments" },
  { path: "discounts", title: "Discounts" },
  { path: "reports", title: "Reports" },
  { path: "staff", title: "Staff Management" },
];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/portal"
        element={
          <RequireCustomer>
            <PortalLayout />
          </RequireCustomer>
        }
      >
        <Route index element={<PortalOverviewPage />} />
        <Route path="subscriptions" element={<PortalSubscriptionsPage />} />
        <Route path="invoices" element={<PortalInvoicesPage />} />
      </Route>
      <Route
        path="/app"
        element={
          <RequireInternal>
            <DashboardLayout />
          </RequireInternal>
        }
      >
        {appPages.map(({ path, title }) => (
          <Route
            key={path}
            path={path}
            element={
              path === "dashboard" ? (
                <RequireInternal permission="reports:read">
                  <DashboardPage />
                </RequireInternal>
              ) : path === "customers" ? (
                <RequireInternal permission="customers:read">
                  <CustomersPage />
                </RequireInternal>
              ) : path === "products" ? (
                <RequireInternal permission="products:read">
                  <ProductsPage />
                </RequireInternal>
              ) : path === "plans" ? (
                <RequireInternal permission="plans:read">
                  <PlansPage />
                </RequireInternal>
              ) : path === "quotations" ? (
                <RequireInternal permission="quotations:read">
                  <QuotationsPage />
                </RequireInternal>
              ) : path === "subscriptions" ? (
                <RequireInternal permission="subscriptions:read">
                  <SubscriptionsPage />
                </RequireInternal>
              ) : path === "invoices" ? (
                <RequireInternal permission="invoices:read">
                  <InvoicesPage />
                </RequireInternal>
              ) : path === "payments" ? (
                <RequireInternal permission="payments:read">
                  <PaymentsPage />
                </RequireInternal>
              ) : path === "discounts" ? (
                <RequireInternal permission="discounts:read">
                  <DiscountsPage />
                </RequireInternal>
              ) : path === "reports" ? (
                <RequireInternal permission="reports:read">
                  <ReportsPage />
                </RequireInternal>
              ) : path === "staff" ? (
                <RequireInternal adminOnly>
                  <StaffPage />
                </RequireInternal>
              ) : (
                <PlaceholderPage title={title} />
              )
            }
          />
        ))}
        <Route
          path="customers/details"
          element={
            <RequireInternal permission="customers:read">
              <CustomerDetailsPage />
            </RequireInternal>
          }
        />
        <Route
          path="products/details"
          element={
            <RequireInternal permission="products:read">
              <ProductDetailsPage />
            </RequireInternal>
          }
        />
        <Route
          path="plans/details"
          element={
            <RequireInternal permission="plans:read">
              <PlanDetailsPage />
            </RequireInternal>
          }
        />
        <Route
          path="subscriptions/details"
          element={
            <RequireInternal permission="subscriptions:read">
              <SubscriptionDetailsPage />
            </RequireInternal>
          }
        />
        <Route
          path="invoices/details"
          element={
            <RequireInternal permission="invoices:read">
              <InvoiceDetailsPage />
            </RequireInternal>
          }
        />
        <Route path="no-access" element={<AccessDenied />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}