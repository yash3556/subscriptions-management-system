import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CustomerFormDialog } from "../components/CustomerFormDialog";
import { CustomerSearch } from "../components/CustomerSearch";
import { CustomerTable } from "../components/CustomerTable";
import type { CustomerFormValues, CustomerSummary } from "../types";

const customers: CustomerSummary[] = [];

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [notice, setNotice] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummary | null>(null);
  const navigate = useNavigate();

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(query)),
    );
  }, [search]);

  function handleSubmit(_values: CustomerFormValues) {
    setNotice(
      `Customer ${
        formMode === "edit" ? "updates" : "creation"
      } are unavailable until the backend API is integrated. No customer was saved.`,
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl" aria-labelledby="customers-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-slate-900"
            id="customers-title"
          >
            Customers
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            View and manage customer contact and billing information.
          </p>
        </div>
        <button
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          onClick={() => {
            setNotice("");
            setSelectedCustomer(null);
            setFormMode("add");
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Add customer
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <CustomerSearch onChange={setSearch} value={search} />
      </div>
      <div className="mt-4">
        <CustomerTable
          customers={filteredCustomers}
          onEdit={(customer) => {
            setNotice("");
            setSelectedCustomer(customer);
            setFormMode("edit");
          }}
          onView={(customer) =>
            navigate("/app/customers/details", { state: customer })
          }
        />
      </div>
      <div
        aria-label="Customer list pagination"
        className="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>Pagination will be available when the customer API is connected.</p>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-500"
            disabled
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-500"
            disabled
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
          notice={notice}
          onClose={() => {
            setFormMode(null);
            setNotice("");
            setSelectedCustomer(null);
          }}
          onSubmit={handleSubmit}
          submitLabel={formMode === "add" ? "Save customer" : "Save changes"}
          title={formMode === "add" ? "Add customer" : "Edit customer"}
        />
      )}
    </section>
  );
}
