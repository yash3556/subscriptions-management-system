import axios from "axios";
import { api } from "./api";
import type { AuthenticatedUser } from "./authService";

export type StaffUser = AuthenticatedUser;

export const STAFF_PERMISSIONS = [
  "customers:read",
  "customers:write",
  "products:read",
  "products:write",
  "plans:read",
  "plans:write",
  "quotations:read",
  "quotations:write",
  "subscriptions:read",
  "subscriptions:write",
  "invoices:read",
  "invoices:write",
  "payments:read",
  "payments:write",
  "discounts:read",
  "discounts:write",
  "reports:read",
] as const;

export async function listStaff(): Promise<StaffUser[]> {
  const response = await api.get<StaffUser[]>("/staff", {
    params: { limit: 100, offset: 0 },
  });
  return response.data;
}

export async function createStaff(payload: {
  name: string;
  email: string;
  password: string;
  permissions: string[];
}): Promise<StaffUser> {
  const response = await api.post<StaffUser>("/staff", payload);
  return response.data;
}

export async function updateStaffStatus(
  userId: string,
  isActive: boolean,
): Promise<StaffUser> {
  const response = await api.patch<StaffUser>(`/staff/${userId}/status`, {
    is_active: isActive,
  });
  return response.data;
}

export async function updateStaffPermissions(
  userId: string,
  permissions: string[],
): Promise<StaffUser> {
  const response = await api.put<StaffUser>(
    `/staff/${userId}/permissions`,
    { permissions },
  );
  return response.data;
}

export function getStaffErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "The staff request failed. Please try again.";
  }
  if (!error.response) {
    return error.code === "ECONNABORTED" || error.code === "ETIMEDOUT"
      ? "The server took too long to respond. Please try again."
      : "Couldn't reach the server. Check your connection and try again.";
  }
  if (error.response.status === 401) {
    return "Your session has expired. Sign in again.";
  }
  if (error.response.status === 403) {
    return "Your account is not permitted to manage staff.";
  }
  if (error.response.status === 409) {
    return "An account with this email already exists.";
  }
  if (error.response.status === 422) {
    return "Check the staff details and selected permissions.";
  }
  return "The staff request could not be completed. Please try again later.";
}
