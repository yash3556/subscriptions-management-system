import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import {
  businessService,
  getBusinessErrorMessage,
  type BusinessRecord,
} from "../../../services/businessService";
import { CustomerFormDialog } from "../components/CustomerFormDialog";
import { CustomerSearch } from "../components/CustomerSearch";
import { CustomerTable } from "../components/CustomerTable";
import type { CustomerFormValues, CustomerSummary } from "../types";

function mapCustomer(record: BusinessRecord): CustomerSummary {
  const address = record.billing_address;
  return {
    id: record.id,
    name: typeof record.name === "string" ? record.name : "",
    email: typeof record.email === "string" ? record.email : "",
    phone: typeof record.phone === "string" ? record.phone : "",
    billing_address:
      typeof address === "object" && address !== null
        ? address as Record<string, string>
        : {},
    billingAddress:
      typeof address === "object" && address !== null
        ? Object.values(address).filter(Boolean).join(", ")
        : "",
    createdAt: typeof record.created_at === "string" ? record.created_at : "",
  };
}

export function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummary | null>(null);
  const navigate = useNavigate();
  const canWrite =
    user?.role === "ADMIN" ||
    (user?.role === "INTERNAL_STAFF" &&
      user.permissions.includes("customers:write"));

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await businessService.customers.list(search, page);
      setCustomers(result.items.map(mapCustomer));
      setHasNext(result.items.length === 100);
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function handleSubmit(values: CustomerFormValues) {
    setIsSaving(true);
    setError("");
    setNotice("");
    const billingAddress = values.billingAddress.trim()
      ? { address: values.billingAddress.trim() }
      : {};
    try {
      if (formMode === "edit" && selectedCustomer) {
        await businessService.customers.update(selectedCustomer.id, {
          name: values.name.trim(),
          phone: values.phone.trim() || null,
          billing_address: billingAddress,
        });
        setNotice("Customer updated.");
      } else {
        await businessService.customers.create({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || null,
          billing_address: billingAddress,
        });
        setNotice("Customer created.");
      }
      setFormMode(null);
      setSelectedCustomer(null);
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(customer: CustomerSummary) {
    if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await businessService.customers.remove(customer.id);
      setNotice("Customer deleted.");
      await refresh();
    } catch (reason) {
      setError(getBusinessErrorMessage(reason));
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl" aria-labelledby="customers-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900" id="customers-title">
            Customers
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            View and manage customer contact and billing information.
          </p>
        </div>
        {canWrite && (
          <button
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            onClick={() => {
              setSelectedCustomer(null);
              setFormMode("add");
            }}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
            Add customer
          </button>
        )}
      </div>

      {(error || notice) && (
        <p className={`mt-4 rounded-md border px-3 py-2.5 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>
          {error || notice}
        </p>
      )}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <CustomerSearch
          onChange={(value) => {
            setPage(1);
            setSearch(value);
          }}
          value={search}
        />
      </div>
      <div className="mt-4">
        {isLoading ? (
          <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600" aria-live="polite">
            Loading customers…
          </p>
        ) : (
          <CustomerTable
            canWrite={canWrite}
            customers={customers}
            onDelete={handleDelete}
            onEdit={(customer) => {
              setSelectedCustomer(customer);
              setFormMode("edit");
            }}
            onView={(customer) =>
              navigate(`/app/customers/details/${customer.id}`)
            }
          />
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>Page {page}</span>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            disabled={page === 1 || isLoading}
            onClick={() => setPage((current) => current - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            disabled={!hasNext || isLoading}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
      {formMode && (
        <CustomerFormDialog
          initialValues={
            selectedCustomer
              ? {
                  name: selectedCustomer.name,
                  email: selectedCustomer.email,
                  phone: selectedCustomer.phone ?? "",
                  billingAddress: selectedCustomer.billingAddress ?? "",
                }
              : undefined
          }
          isSubmitting={isSaving}
          notice={error}
          onClose={() => {
            if (!isSaving) {
              setFormMode(null);
              setSelectedCustomer(null);
              setError("");
            }
          }}
          onSubmit={handleSubmit}
          submitLabel={formMode === "add" ? "Save customer" : "Save changes"}
          title={formMode === "add" ? "Add customer" : "Edit customer"}
        />
      )}
    </section>
  );
}
