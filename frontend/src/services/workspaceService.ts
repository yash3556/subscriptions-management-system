const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type RecordItem = Record<string, unknown> & { id: string };
export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "Admin" | "Staff" | "Customer";
};

function token() {
  return localStorage.getItem("subscribely_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const accessToken = token();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      throw new Error(message);
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function authenticate(
  mode: "login" | "register",
  payload: Record<string, string>,
) {
  const result = await request<{ access_token: string; user: User }>(
    `/api/auth/${mode}`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  localStorage.setItem("subscribely_token", result.access_token);
  return result.user;
}

export async function loadUser() {
  return request<User>("/api/auth/me");
}

export async function getDashboard() {
  return request<{
    active_subscriptions: number;
    collected_minor: number;
    outstanding_minor: number;
    overdue_invoices: number;
    recent_invoices: RecordItem[];
  }>("/api/dashboard");
}

export async function getRecords(resource: string, q = "") {
  const search = q ? `?q=${encodeURIComponent(q)}` : "";
  const result = await request<{ items: RecordItem[] }>(
    `/api/${resource}${search}`,
  );
  return result.items;
}

export async function getTeam() {
  const result = await request<{ items: RecordItem[] }>("/api/users");
  return result.items;
}

export async function createStaff(values: object) {
  return request<RecordItem>("/api/auth/staff", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export async function createRecord(resource: string, values: object) {
  return request<RecordItem>(`/api/${resource}`, {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export async function updateRecord(resource: string, id: string, values: object) {
  return request<RecordItem>(`/api/${resource}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export async function removeRecord(resource: string, id: string) {
  return request<void>(`/api/${resource}/${id}`, { method: "DELETE" });
}

export async function confirmQuotation(id: string) {
  return request<RecordItem>(`/api/quotations/${id}/confirm`, {
    method: "POST",
  });
}

export async function generateInvoice(id: string) {
  return request<RecordItem>(`/api/subscriptions/${id}/invoices`, {
    method: "POST",
  });
}

export async function recordPayment(id: string, data: object) {
  return request<RecordItem>(`/api/invoices/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
