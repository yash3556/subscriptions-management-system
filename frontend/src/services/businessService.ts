import axios from "axios";
import { api } from "./api";

export interface BusinessRecord {
  id: string;
  [key: string]: unknown;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  page_size: number;
}

export interface DashboardSummary {
  total_customers: number;
  total_products: number;
  active_subscriptions: number;
  total_invoices: number;
  collected_revenue_paise: number;
  outstanding_paise: number;
  overdue_invoices: number;
  recent_transactions: BusinessRecord[];
  recent_subscriptions: BusinessRecord[];
}

export interface RevenueRow {
  month: string;
  collected_paise: number;
  payment_count: number;
}

const pageParams = { page: 1, page_size: 100 };

async function list<T extends BusinessRecord>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<PageResult<T>> {
  const response = await api.get<PageResult<T>>(path, {
    params: { ...pageParams, ...params },
  });
  return response.data;
}

async function create<T extends BusinessRecord>(
  path: string,
  payload: object,
): Promise<T> {
  const response = await api.post<T>(path, payload);
  return response.data;
}

async function update<T extends BusinessRecord>(
  path: string,
  payload: object,
): Promise<T> {
  const response = await api.patch<T>(path, payload);
  return response.data;
}

async function action<T>(
  path: string,
  payload?: object,
): Promise<T> {
  const response = await api.post<T>(path, payload ?? {});
  return response.data;
}

export const businessService = {
  customers: {
    list: (q = "", page = 1) => list("/customers", { q: q || undefined, page }),
    get: async (id: string) => (await api.get<BusinessRecord>(`/customers/${id}`)).data,
    create: (payload: object) => create("/customers", payload),
    update: (id: string, payload: object) => update(`/customers/${id}`, payload),
    remove: (id: string) => api.delete(`/customers/${id}`),
    quotations: (id: string) => list(`/customers/${id}/quotations`),
    subscriptions: (id: string) => list(`/customers/${id}/subscriptions`),
    invoices: (id: string) => list(`/customers/${id}/invoices`),
    payments: (id: string) => list(`/customers/${id}/payments`),
    me: async () => (await api.get<BusinessRecord>("/customers/me")).data,
  },
  products: {
    list: (q = "", page = 1) => list("/products", { q: q || undefined, page }),
    get: async (id: string) => (await api.get<BusinessRecord>(`/products/${id}`)).data,
    create: (payload: object) => create("/products", payload),
    update: (id: string, payload: object) => update(`/products/${id}`, payload),
    deactivate: (id: string) => api.delete(`/products/${id}`),
  },
  plans: {
    list: (q = "", page = 1) => list("/plans", { q: q || undefined, page }),
    get: async (id: string) => (await api.get<BusinessRecord>(`/plans/${id}`)).data,
    create: (payload: object) => create("/plans", payload),
    update: (id: string, payload: object) => update(`/plans/${id}`, payload),
    deactivate: (id: string) => api.delete(`/plans/${id}`),
  },
  quotations: {
    list: (q = "", page = 1) => list("/quotations", { q: q || undefined, page }),
    create: (payload: object) => create("/quotations", payload),
    update: (id: string, payload: object) => update(`/quotations/${id}`, payload),
    remove: (id: string) => api.delete(`/quotations/${id}`),
    send: (id: string) => action(`/quotations/${id}/send`),
    accept: (id: string) => action(`/quotations/${id}/accept`),
    reject: (id: string) => action(`/quotations/${id}/reject`),
    confirm: (id: string) => action(`/quotations/${id}/confirm`),
  },
  subscriptions: {
    list: () => list("/subscriptions"),
    get: async (id: string) => (await api.get<BusinessRecord>(`/subscriptions/${id}`)).data,
    history: async (id: string) =>
      (await api.get<{ items: BusinessRecord[] }>(`/subscriptions/${id}/history`)).data.items,
    activate: (id: string, payload: object) => action(`/subscriptions/${id}/activate`, payload),
    pause: (id: string) => action(`/subscriptions/${id}/pause`),
    resume: (id: string) => action(`/subscriptions/${id}/resume`),
    renew: (id: string, payload: object) => action(`/subscriptions/${id}/renew`, payload),
    close: (id: string) => action(`/subscriptions/${id}/close`),
  },
  invoices: {
    list: (q = "", status?: string, page = 1) =>
      list("/invoices", { q: q || undefined, status: status || undefined, page }),
    get: async (id: string) => (await api.get<BusinessRecord>(`/invoices/${id}`)).data,
    generate: (subscriptionId: string) =>
      action<BusinessRecord>(`/invoices/from-subscription/${subscriptionId}`),
    confirm: (id: string, payload: object = {}) => action(`/invoices/${id}/confirm`, payload),
    cancel: (id: string) => action(`/invoices/${id}/cancel`),
  },
  payments: {
    list: (q = "", page = 1) => list("/payments", { q: q || undefined, page }),
    forInvoice: async (invoiceId: string) =>
      (await api.get<BusinessRecord[]>(`/payments/invoices/${invoiceId}`)).data,
    create: async (payload: object, key: string) =>
      (await api.post<BusinessRecord>("/payments", payload, {
        headers: { "Idempotency-Key": key },
      })).data,
  },
  discounts: {
    list: (q = "", page = 1) => list("/discounts", { q: q || undefined, page }),
    create: (payload: object) => create("/discounts", payload),
    update: (id: string, payload: object) => update(`/discounts/${id}`, payload),
    deactivate: (id: string) => api.delete(`/discounts/${id}`),
  },
  reports: {
    summary: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
    revenue: async (from?: string, to?: string) =>
      (await api.get<RevenueRow[]>("/dashboard/revenue", {
        params: {
          from_date: from ? `${from}T00:00:00Z` : undefined,
          to_date: to ? `${to}T23:59:59Z` : undefined,
        },
      })).data,
    overdue: () => list("/dashboard/overdue"),
  },
};

export function getBusinessErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<{ detail?: unknown }>(error)) {
    return error instanceof Error ? error.message : "The request could not be completed.";
  }
  const status = error.response?.status;
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (!error.response) {
    return error.code === "ECONNABORTED" || error.code === "ETIMEDOUT"
      ? "The server took too long to respond. Please try again."
      : "Couldn't reach the server. Check your connection and try again.";
  }
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "Your account is not permitted to perform this action.";
  if (status === 404) return "This record could not be found.";
  if (status === 409) return "This action conflicts with the record's current state.";
  if (status === 422) return "Check the form values and try again.";
  if (status && status >= 500) return "The server could not complete the request. Please try again later.";
  return `Request failed${status ? ` (${status})` : ""}.`;
}

export function asRecord(value: unknown): BusinessRecord | null {
  return typeof value === "object" && value !== null && "id" in value &&
    typeof value.id === "string"
    ? value as BusinessRecord
    : null;
}

export function recordString(record: BusinessRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function recordNumber(record: BusinessRecord, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
