import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  authenticate,
  confirmQuotation,
  createStaff,
  createRecord,
  generateInvoice,
  getDashboard,
  getRecords,
  getTeam,
  loadUser,
  recordPayment,
  removeRecord,
  type RecordItem,
  type User,
  updateRecord,
} from "../services/workspaceService";

type Resource =
  | "customers"
  | "products"
  | "plans"
  | "quotations"
  | "subscriptions"
  | "invoices"
  | "payments"
  | "discounts";
type Page = Resource | "overview" | "team";
type FieldKind = "text" | "email" | "number" | "money" | "date" | "select" | "textarea";
type Field = {
  name: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  options?: string[];
  resource?: Resource;
  placeholder?: string;
};

const labels: Record<Resource, string> = {
  customers: "Customers",
  products: "Products",
  plans: "Plans",
  quotations: "Quotations",
  subscriptions: "Subscriptions",
  invoices: "Invoices",
  payments: "Payments",
  discounts: "Discounts",
};
const pageLabels: Record<Page, string> = {
  ...labels,
  overview: "Overview",
  team: "Team",
};

const fields: Partial<Record<Page, Field[]>> = {
  customers: [
    { name: "name", label: "Customer name", required: true },
    { name: "email", label: "Email address", kind: "email", required: true },
    { name: "company", label: "Company" },
    { name: "phone", label: "Phone" },
  ],
  products: [
    { name: "name", label: "Product name", required: true },
    { name: "type", label: "Product type", kind: "select", options: ["Service", "Subscription", "Product"] },
    { name: "sales_price", label: "Sales price (INR)", kind: "money", required: true },
    { name: "cost_price", label: "Cost price (INR)", kind: "money" },
    { name: "variants_json", label: "Variants (JSON)", kind: "textarea", placeholder: '[{"name":"Odoo","adjustment_minor":56000}]' },
  ],
  plans: [
    { name: "name", label: "Plan name", required: true },
    { name: "price", label: "Price per period (INR)", kind: "money", required: true },
    { name: "billing_frequency", label: "Billing frequency", kind: "select", options: ["daily", "weekly", "monthly", "yearly"] },
    { name: "minimum_quantity", label: "Minimum quantity", kind: "number" },
    { name: "tax_rate", label: "Tax rate (%)", kind: "number" },
  ],
  quotations: [
    { name: "customer_id", label: "Customer", kind: "select", resource: "customers", required: true },
    { name: "plan_id", label: "Plan", kind: "select", resource: "plans", required: true },
    { name: "valid_until", label: "Valid until", kind: "date" },
  ],
  subscriptions: [
    { name: "customer_id", label: "Customer", kind: "select", resource: "customers", required: true },
    { name: "plan_id", label: "Plan", kind: "select", resource: "plans", required: true },
    { name: "start_date", label: "Start date", kind: "date", required: true },
  ],
  discounts: [
    { name: "name", label: "Discount name", required: true },
    { name: "discount_type", label: "Discount type", kind: "select", options: ["percentage", "fixed"] },
    { name: "value", label: "Discount value", kind: "number", required: true },
    { name: "minimum_purchase", label: "Minimum purchase (INR)", kind: "money" },
    { name: "usage_limit", label: "Usage limit", kind: "number" },
    { name: "starts_at", label: "Start date", kind: "date" },
    { name: "ends_at", label: "End date", kind: "date" },
  ],
  team: [
    { name: "first_name", label: "First name", required: true },
    { name: "last_name", label: "Last name", required: true },
    { name: "email", label: "Email address", kind: "email", required: true },
    { name: "password", label: "Temporary password", kind: "text", required: true },
  ],
};

const navItems: { key: Page; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "◫" },
  { key: "customers", label: "Customers", icon: "♧" },
  { key: "products", label: "Products", icon: "◇" },
  { key: "plans", label: "Plans", icon: "◷" },
  { key: "quotations", label: "Quotations", icon: "▤" },
  { key: "subscriptions", label: "Subscriptions", icon: "∞" },
  { key: "invoices", label: "Invoices", icon: "▧" },
  { key: "payments", label: "Payments", icon: "↗" },
  { key: "discounts", label: "Discounts", icon: "%" },
  { key: "team", label: "Team", icon: "♙" },
];

const money = (minor: unknown) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(minor ?? 0) / 100);

function iconFor(label: string) {
  return label.slice(0, 1).toUpperCase();
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      [...form.entries()].map(([key, value]) => [key, String(value)]),
    );
    try {
      const user = await authenticate(mode, payload);
      onAuthenticated(user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <aside className="auth-art">
          <div className="auth-logo">
            <span className="brand-mark">✳</span> Subscribely
          </div>
          <div>
            <span className="eyebrow">YOUR BUSINESS, IN SYNC</span>
            <h1>Subscriptions, without the busywork.</h1>
            <p>One calm place to manage plans, customers, and every recurring payment.</p>
          </div>
          <p className="auth-caption">A little more clarity for every billing cycle.</p>
        </aside>
        <section className="auth-form-panel">
          <div className="auth-form">
            <span className="eyebrow">{mode === "register" ? "GET STARTED" : "WELCOME BACK"}</span>
            <h2>{mode === "register" ? "Create your account" : "Sign in to your workspace"}</h2>
            <p className="auth-subtitle">
              {mode === "register"
                ? "Your first account becomes the workspace admin."
                : "Pick up right where you left off."}
            </p>
            <form onSubmit={submit}>
              {mode === "register" && (
                <div className="workspace-name-row">
                  <label className="workspace-field">
                    <span>First name</span>
                    <input autoComplete="given-name" name="first_name" required />
                  </label>
                  <label className="workspace-field">
                    <span>Last name</span>
                    <input autoComplete="family-name" name="last_name" required />
                  </label>
                </div>
              )}
              <label className="workspace-field">
                <span>Email address</span>
                <input autoComplete="email" name="email" required type="email" />
              </label>
              <label className="workspace-field">
                <span>Password</span>
                <input
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  minLength={mode === "register" ? 9 : undefined}
                  name="password"
                  required
                  type="password"
                />
                {mode === "register" && (
                  <small>9+ characters with uppercase, lowercase, and a special character.</small>
                )}
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="workspace-primary auth-submit" disabled={busy} type="submit">
                {busy ? "Please wait…" : mode === "register" ? "Create workspace" : "Sign in"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
            <p className="auth-switch">
              {mode === "register" ? "Already have an account?" : "New to Subscribely?"}{" "}
              <button
                onClick={() => {
                  setError("");
                  setMode(mode === "register" ? "login" : "register");
                }}
                type="button"
              >
                {mode === "register" ? "Sign in" : "Create account"}
              </button>
            </p>
          </div>
          <div className="auth-footnote">Private workspace · Secure sign-in</div>
        </section>
      </section>
    </main>
  );
}

function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<Page>("overview");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [related, setRelated] = useState<Partial<Record<Resource, RecordItem[]>>>({});
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ resource: Page; record?: RecordItem } | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<RecordItem | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("subscribely_token")) {
      setReady(true);
      return;
    }
    loadUser()
      .then(setUser)
      .catch(() => localStorage.removeItem("subscribely_token"))
      .finally(() => setReady(true));
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const data = active === "team"
        ? await getTeam()
        : await getRecords(active === "overview" ? "invoices" : active, search);
      setRecords(data);
      if (active === "overview") {
        const [stats, invoices, subscriptions, customers, plans, payments] = await Promise.all([
          getDashboard(),
          getRecords("invoices"),
          getRecords("subscriptions"),
          getRecords("customers"),
          getRecords("plans"),
          getRecords("payments"),
        ]);
        setDashboard(stats);
        setRelated({ invoices, subscriptions, customers, plans, payments });
      } else if (active === "quotations" || active === "subscriptions") {
        const [customers, plans] = await Promise.all([
          getRecords("customers"),
          getRecords("plans"),
        ]);
        setRelated({ customers, plans });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load workspace data");
    }
  }, [active, search, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allowedNav = useMemo(
    () => navItems.filter((item) =>
      (item.key !== "discounts" || user?.role === "Admin")
      && (item.key !== "team" || user?.role === "Admin")),
    [user],
  );

  function signOut() {
    localStorage.removeItem("subscribely_token");
    setUser(null);
    setActive("overview");
    setRecords([]);
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {};
    for (const [key, raw] of form.entries()) {
      const value = String(raw);
      if (key === "sales_price" || key === "cost_price" || key === "price" || key === "minimum_purchase") {
        values[key === "price" ? "price_minor" : `${key}_minor`] = Math.round(Number(value) * 100);
      } else if (key === "value" && modal.resource === "discounts") {
        const discountType = String(form.get("discount_type"));
        values.value = discountType === "fixed" ? Math.round(Number(value) * 100) : Number(value);
        if (discountType === "fixed") values.value_minor = values.value;
      } else if (key === "minimum_quantity" || key === "tax_rate" || key === "value" || key === "usage_limit") {
        if (value) values[key] = Number(value);
      } else if (key === "variants_json") {
        if (value.trim()) {
          try {
            values.variants = JSON.parse(value);
          } catch {
            setError("Variants must be valid JSON.");
            setBusy(false);
            return;
          }
        } else {
          values.variants = [];
        }
      } else if (value) {
        values[key] = value;
      }
    }
    if (modal.resource === "quotations" || modal.resource === "subscriptions") {
      const customer = related.customers?.find((item) => item.id === values.customer_id);
      const plan = related.plans?.find((item) => item.id === values.plan_id);
      if (customer) {
        values.customer_name = customer.name;
        values.customer_email = customer.email;
      }
      if (plan) {
        values.plan_name = plan.name;
        values.billing_frequency = plan.billing_frequency;
      }
    }
    try {
      if (modal.resource === "team") {
        await createStaff(values);
      } else if (modal.record) {
        await updateRecord(modal.resource, modal.record.id, values);
      } else {
        await createRecord(modal.resource, values);
      }
      setModal(null);
      setNotice(`Record ${modal.record ? "updated" : "created"}.`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save this record");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      setPaymentInvoice(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That action could not be completed");
    } finally {
      setBusy(false);
    }
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentInvoice) return;
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    await runAction(
      () =>
        recordPayment(paymentInvoice.id, {
          amount_minor: Math.round(amount * 100),
          method: form.get("method"),
          note: form.get("note"),
        }),
      "Payment recorded against the invoice.",
    );
  }

  if (!ready) return <div className="app-loading">Loading your workspace…</div>;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  const canManage = user.role !== "Customer";
  const currentLabel = pageLabels[active];
  const columns = active === "team"
    ? [["first_name", "Name"], ["last_name", "Last name"], ["email", "Email"], ["role", "Role"]]
    : active === "customers"
    ? [["name", "Customer"], ["company", "Company"], ["email", "Email"], ["phone", "Phone"]]
    : active === "products"
      ? [["name", "Product"], ["type", "Type"], ["sales_price_minor", "Sales price"], ["variants", "Variants"]]
      : active === "plans"
        ? [["name", "Plan"], ["price_minor", "Price"], ["billing_frequency", "Frequency"], ["status", "Status"]]
        : active === "quotations"
          ? [["number", "Quote"], ["customer_name", "Customer"], ["plan_name", "Plan"], ["status", "Status"], ["valid_until", "Valid until"]]
          : active === "subscriptions"
            ? [["number", "Subscription"], ["customer_name", "Customer"], ["plan_name", "Plan"], ["status", "Status"], ["billing_frequency", "Frequency"]]
            : active === "invoices"
              ? [["number", "Invoice"], ["customer_name", "Customer"], ["period_start", "Billing period"], ["total_minor", "Total"], ["status", "Status"]]
              : active === "payments"
                ? [["invoice_number", "Invoice"], ["customer_name", "Customer"], ["amount_minor", "Amount"], ["method", "Method"], ["created_at", "Date"]]
                : [["name", "Discount"], ["discount_type", "Type"], ["value", "Value"], ["status", "Status"]];

  function cellValue(record: RecordItem, key: string) {
    const value = record[key];
    if (key.endsWith("_minor")) return money(value);
    if (active === "discounts" && key === "value") {
      return record.discount_type === "fixed" ? money(value) : `${String(value)}%`;
    }
    if (key === "created_at" && typeof value === "string") return new Date(value).toLocaleDateString();
    if (Array.isArray(value)) return `${value.length} ${key === "variants" ? "variants" : "items"}`;
    if (typeof value === "object" && value !== null) return "—";
    return value == null || value === "" ? "—" : String(value);
  }

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <a className="workspace-brand" href="#overview" onClick={(event) => { event.preventDefault(); setActive("overview"); }}>
          <span className="workspace-brand-mark">✳</span>
          <span>Subscribely<small>REVENUE WORKSPACE</small></span>
        </a>
        <span className="nav-caption">WORKSPACE</span>
        <nav className="workspace-nav" aria-label="Main navigation">
          {allowedNav.map((item) => (
            <button
              aria-current={active === item.key ? "page" : undefined}
              className={active === item.key ? "workspace-nav-item selected" : "workspace-nav-item"}
              key={item.key}
              onClick={() => { setActive(item.key); setSearch(""); setError(""); setNotice(""); }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.key === "invoices" && dashboard?.overdue_invoices ? (
                <span className="nav-count">{dashboard.overdue_invoices}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-indicator"><span /> API connected</div>
          <div className="sidebar-user">
            <span className="user-avatar">{iconFor(user.first_name)}</span>
            <span className="sidebar-user-name">{user.first_name} {user.last_name}<small>{user.role}</small></span>
            <button aria-label="Sign out" className="signout-button" onClick={signOut} title="Sign out">↗</button>
          </div>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b>{currentLabel}</div>
          <div className="topbar-actions">
            {active !== "overview" && (
              <label className="workspace-search">
                <span aria-hidden="true">⌕</span>
                <input
                  aria-label={`Search ${currentLabel.toLowerCase()}`}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search records"
                  value={search}
                />
                <kbd>/</kbd>
              </label>
            )}
            <span className="date-chip">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </header>

        <section className="workspace-content">
          <div className="page-title-row">
            <div>
              <span className="eyebrow">BRIGHTLOOP SOFTWARE</span>
              <h1>{active === "overview" ? "Your business at a glance" : currentLabel}</h1>
              <p>{active === "overview" ? "A clear view of your recurring revenue and what needs attention." : `Manage your ${currentLabel.toLowerCase()} and keep billing moving.`}</p>
            </div>
            {canManage && active !== "overview" && fields[active] && (
              <button className="workspace-primary" onClick={() => setModal({ resource: active })}>
                <span>＋</span> Add {active === "team" ? "team member" : active === "customers" ? "customer" : active === "products" ? "product" : active === "plans" ? "plan" : active === "quotations" ? "quotation" : active === "subscriptions" ? "subscription" : "discount"}
              </button>
            )}
          </div>

          {(error || notice) && (
            <div className={error ? "workspace-alert is-error" : "workspace-alert"} role={error ? "alert" : "status"}>
              <span>{error || notice}</span>
              <button aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}>×</button>
            </div>
          )}

          {active === "overview" ? (
            <Overview
              dashboard={dashboard}
              invoices={related.invoices ?? []}
              payments={related.payments ?? []}
              subscriptions={related.subscriptions ?? []}
              onNavigate={setActive}
            />
          ) : (
            <section className="data-card">
              <div className="data-card-header">
                <div><h2>{currentLabel}</h2><p>{records.length} records</p></div>
                <button className="refresh-button" onClick={() => void refresh()}>↻ <span>Refresh</span></button>
              </div>
              <div className="table-scroll">
                <table className="records-table">
                  <thead><tr>{columns.map(([, title]) => <th key={title}>{title}</th>)}<th className="actions-heading">Actions</th></tr></thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        {columns.map(([key]) => (
                          <td key={key}>
                            {key === "name" ? (
                              <span className="record-name"><span className="record-avatar">{iconFor(String(record[key] ?? "R"))}</span>{cellValue(record, key)}</span>
                            ) : key === "status" ? (
                              <span className={`status-pill status-${String(record[key] ?? "draft").toLowerCase().replace(/ /g, "-")}`}>{cellValue(record, key)}</span>
                            ) : (
                              <span className={key.endsWith("_minor") ? "amount-cell" : ""}>{cellValue(record, key)}</span>
                            )}
                          </td>
                        ))}
                        <td className="record-actions">
                          {active === "quotations" && record.status !== "Confirmed" && canManage && (
                            <button onClick={() => void runAction(() => confirmQuotation(record.id), "Quotation confirmed and subscription activated.")}>Confirm</button>
                          )}
                          {active === "subscriptions" && record.status === "Active" && canManage && (
                            <button onClick={() => void runAction(
                              () => generateInvoice(record.id),
                              "Invoice generated for this billing period.",
                            )}>Generate invoice</button>
                          )}
                          {active === "invoices" && record.status !== "Paid" && canManage && (
                            <button onClick={() => setPaymentInvoice(record)}>Record payment</button>
                          )}
                          {canManage && active !== "team" && fields[active] && (
                            <>
                              <button onClick={() => setModal({ resource: active, record })}>Edit</button>
                              <button aria-label={`Delete ${String(record.name ?? record.number ?? "record")}`} className="icon-action danger-action" onClick={() => {
                                if (window.confirm(`Delete this ${pageLabels[active].toLowerCase().replace(/s$/, "")}?`)) {
                                  void runAction(() => removeRecord(active, record.id), "Record deleted.");
                                }
                              }}>×</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr><td className="empty-row" colSpan={columns.length + 1}>
                        <span className="empty-icon">◇</span>
                        <strong>{search ? "No matching records" : `No ${currentLabel.toLowerCase()} yet`}</strong>
                        <span>{search ? "Try a different search term." : "Create your first record to get started."}</span>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer"><span>Showing {records.length} records</span><span>Securely stored in your workspace</span></div>
            </section>
          )}
        </section>
      </main>

      {modal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section aria-labelledby="modal-heading" aria-modal="true" className="workspace-modal" role="dialog">
            <div className="modal-heading">
              <div><span className="eyebrow">{modal.record ? "EDIT RECORD" : "NEW RECORD"}</span><h2 id="modal-heading">{modal.record ? "Edit record" : `Add ${pageLabels[modal.resource].slice(0, -1).toLowerCase()}`}</h2></div>
              <button aria-label="Close dialog" className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form className="workspace-form" onSubmit={(event) => void submitRecord(event)}>
              {(fields[modal.resource] ?? []).map((field) => (
                <label className="workspace-field" key={field.name}>
                  <span>{field.label}{field.required && <b> *</b>}</span>
                  {field.kind === "select" ? (
                    <select name={field.name} required={field.required} defaultValue={String(modal.record?.[field.name] ?? "")}>
                      <option disabled value="">Select {field.label.toLowerCase()}</option>
                      {(field.resource ? related[field.resource] ?? [] : field.options?.map((value) => ({ id: value, name: value })) ?? []).map((option) => (
                        <option key={option.id} value={field.resource ? option.id : String(option.name ?? option.id)}>
                          {String(option.name ?? option.id)}
                        </option>
                      ))}
                    </select>
                  ) : field.kind === "textarea" ? (
                    <textarea defaultValue={field.name === "variants_json" && Array.isArray(modal.record?.variants) ? JSON.stringify(modal.record.variants, null, 2) : String(modal.record?.[field.name] ?? "")} name={field.name} placeholder={field.placeholder} rows={3} />
                  ) : (
                    <input
                      name={field.name}
                      defaultValue={
                        field.kind === "money"
                          ? modal.record?.[field.name.replace(/_price$/, "_price_minor").replace(/^price$/, "price_minor").replace(/^minimum_purchase$/, "minimum_purchase_minor")] == null
                            ? ""
                            : Number(modal.record[field.name.replace(/_price$/, "_price_minor").replace(/^price$/, "price_minor").replace(/^minimum_purchase$/, "minimum_purchase_minor")]) / 100
                          : String(modal.record?.[field.name] ?? "")
                      }
                      placeholder={field.placeholder}
                      required={field.required}
                      step={field.kind === "money" ? "0.01" : "any"}
                      type={field.kind === "money" ? "number" : field.kind ?? "text"}
                    />
                  )}
                </label>
              ))}
              {error && <p className="auth-error" role="alert">{error}</p>}
              <div className="modal-actions">
                <button className="workspace-secondary" onClick={() => setModal(null)} type="button">Cancel</button>
                <button className="workspace-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save record"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {paymentInvoice && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaymentInvoice(null); }}>
          <section aria-labelledby="payment-heading" aria-modal="true" className="workspace-modal" role="dialog">
            <div className="modal-heading">
              <div><span className="eyebrow">INVOICE PAYMENT</span><h2 id="payment-heading">Record a payment</h2></div>
              <button aria-label="Close dialog" className="modal-close" onClick={() => setPaymentInvoice(null)}>×</button>
            </div>
            <p className="payment-invoice-summary">{String(paymentInvoice.number)} · {money(paymentInvoice.total_minor)}</p>
            <form className="workspace-form" onSubmit={(event) => void submitPayment(event)}>
              <label className="workspace-field"><span>Amount (INR)</span><input max={Number(paymentInvoice.total_minor ?? 0) / 100} min="0.01" name="amount" required step="0.01" type="number" /></label>
              <label className="workspace-field"><span>Payment method</span><select name="method"><option>Bank transfer</option><option>UPI</option><option>Cash</option><option>Card</option><option>Other</option></select></label>
              <label className="workspace-field"><span>Note</span><input name="note" placeholder="Optional reference" /></label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <div className="modal-actions">
                <button className="workspace-secondary" onClick={() => setPaymentInvoice(null)} type="button">Cancel</button>
                <button className="workspace-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save payment"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Overview({
  dashboard,
  invoices,
  payments,
  subscriptions,
  onNavigate,
}: {
  dashboard: Awaited<ReturnType<typeof getDashboard>> | null;
  invoices: RecordItem[];
  payments: RecordItem[];
  subscriptions: RecordItem[];
  onNavigate: (page: Page) => void;
}) {
  const stats = dashboard ?? {
    active_subscriptions: 0,
    collected_minor: 0,
    outstanding_minor: 0,
    overdue_invoices: 0,
    recent_invoices: [],
  };
  const active = subscriptions.filter((item) => item.status === "Active").length;
  const monthSlots = Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (11 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const amount = payments.reduce((sum, payment) => {
      const created = new Date(String(payment.created_at ?? ""));
      return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth()
        ? sum + Number(payment.amount_minor ?? 0)
        : sum;
    }, 0);
    return {
      key,
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      amount,
    };
  });
  const maxMonthlyAmount = Math.max(...monthSlots.map((slot) => slot.amount), 1);
  return (
    <div className="overview-grid">
      <div className="metric-grid">
        <MetricCard label="Active subscriptions" value={String(stats.active_subscriptions ?? active)} change="Currently billing" icon="∞" tone="violet" />
        <MetricCard label="Collected revenue" value={money(stats.collected_minor)} change="From recorded payments" icon="↗" tone="green" />
        <MetricCard label="Outstanding" value={money(stats.outstanding_minor)} change="Unpaid invoice balance" icon="◷" tone="amber" />
        <MetricCard label="Overdue invoices" value={String(stats.overdue_invoices)} change="Need follow-up" icon="!" tone="rose" />
      </div>
      <section className="overview-card revenue-card">
        <div className="overview-card-heading">
          <div><h2>Revenue overview</h2><p>Collected payments across your workspace</p></div>
          <span className="period-tag">Last 12 months <span>⌄</span></span>
        </div>
        <div className="chart-summary"><strong>{money(stats.collected_minor)}</strong><span> recorded revenue</span></div>
        <div aria-label="Monthly recorded payment revenue" className="bar-chart" role="img">
          <div className="chart-y-labels"><span>₹ 40k</span><span>₹ 20k</span><span>₹ 0</span></div>
          <div className="chart-plot">
            <div className="chart-grid-lines"><i /><i /><i /></div>
            <div className="bars">
              {monthSlots.map((slot) => <span aria-label={`${slot.label}: ${money(slot.amount)}`} className={slot.amount > 0 ? "bar active-bar" : "bar"} key={slot.key} style={{ height: `${Math.max(slot.amount / maxMonthlyAmount * 100, 4)}%` }} />)}
            </div>
          </div>
          <div className="chart-month-labels">{monthSlots.map((slot) => <span key={slot.key}>{slot.label}</span>)}</div>
        </div>
      </section>
      <section className="overview-card attention-card">
        <div className="overview-card-heading">
          <div><h2>Billing attention</h2><p>Records to review</p></div>
          <button aria-label="View invoices" className="round-arrow" onClick={() => onNavigate("invoices")}>↗</button>
        </div>
        <div className="attention-metric"><span className="attention-dot" /><span>Outstanding invoices</span><strong>{invoices.filter((invoice) => invoice.status !== "Paid").length}</strong></div>
        <div className="attention-metric"><span className="attention-dot rose-dot" /><span>Past due</span><strong>{stats.overdue_invoices}</strong></div>
        <button className="text-link" onClick={() => onNavigate("invoices")}>Review invoices <span>→</span></button>
        <div className="attention-illustration" aria-hidden="true"><span>◎</span><span>◌</span><span>✦</span></div>
      </section>
      <section className="overview-card recent-card">
        <div className="overview-card-heading">
          <div><h2>Recent invoices</h2><p>Your latest billing activity</p></div>
          <button className="text-link" onClick={() => onNavigate("invoices")}>View all <span>→</span></button>
        </div>
        <div className="recent-list">
          {invoices.slice(0, 4).map((invoice) => (
            <div className="recent-row" key={invoice.id}>
              <span className="invoice-symbol">▧</span>
              <span className="recent-invoice-name"><strong>{String(invoice.number ?? "Invoice")}</strong><small>{String(invoice.customer_name ?? "Customer")}</small></span>
              <span className="recent-amount">{money(invoice.total_minor)}</span>
              <span className={`status-pill status-${String(invoice.status ?? "due").toLowerCase().replace(/ /g, "-")}`}>{String(invoice.status ?? "Due")}</span>
            </div>
          ))}
          {invoices.length === 0 && <p className="overview-empty">No invoices yet. Start by setting up a plan and subscription.</p>}
        </div>
      </section>
      <section className="overview-card quick-card">
        <span className="eyebrow">GET MOVING</span>
        <h2>Keep your recurring revenue in rhythm.</h2>
        <p>Start with a customer and plan. Then create a quote or subscription and invoice your first billing period.</p>
        <div className="quick-actions">
          <button onClick={() => onNavigate("customers")}>Add customer <span>→</span></button>
          <button onClick={() => onNavigate("subscriptions")}>New subscription <span>→</span></button>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon,
  tone,
}: {
  label: string;
  value: string;
  change: string;
  icon: string;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-change">{change}</span>
      <span className={`metric-spark ${tone}`} aria-hidden="true">⌁</span>
    </article>
  );
}

export default function WorkspaceApp() {
  return <Workspace />;
}
