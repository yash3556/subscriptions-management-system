import axios from "axios";
import { api, setAccessToken } from "./api";

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "INTERNAL_STAFF" | "ADMIN";
  permissions: string[];
  is_active: boolean;
  created_at: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "INTERNAL_STAFF" | "ADMIN";
  permissions: string[];
  is_active: boolean;
  created_at: string;
}

interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthenticatedUser;
}

interface RegisterCustomerRequest {
  name: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface ApiErrorResponse {
  detail?: unknown;
}

interface CsrfResponse {
  csrf_token: string;
}

interface MessageResponse {
  message: string;
}

interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export async function login(
  credentials: LoginRequest,
): Promise<AuthenticatedUser> {
  const response = await api.post<LoginResponse>("/auth/login", credentials);
  setAccessToken(response.data.access_token);
  return response.data.user;
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await api.post<MessageResponse>(
    "/auth/forgot-password",
    { email },
  );
  return response.data.message;
}

export async function resetPassword(
  payload: ResetPasswordRequest,
): Promise<string> {
  const response = await api.post<MessageResponse>(
    "/auth/reset-password",
    payload,
  );
  return response.data.message;
}

function getPasswordRecoveryErrorMessage(
  error: unknown,
  action: "request" | "reset",
): string {
  const actionText = action === "request" ? "send the request" : "reset the password";
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return `We couldn't ${actionText}. Please try again.`;
  }

  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return "The server took too long to respond. Please try again.";
    }
    return "Couldn't reach the server. Check your connection and try again.";
  }

  if (error.response.status === 422) {
    return action === "request"
      ? "Enter a valid email address."
      : "The new password does not meet the password requirements.";
  }
  if (action === "reset" && error.response.status === 400) {
    return "This reset link is invalid, expired, or already used. Request a new link.";
  }
  if (error.response.status === 503) {
    return "The service is temporarily unavailable. Please try again later.";
  }

  return `We couldn't ${actionText} right now. Please try again later.`;
}

export function getForgotPasswordErrorMessage(error: unknown): string {
  return getPasswordRecoveryErrorMessage(error, "request");
}

export function getResetPasswordErrorMessage(error: unknown): string {
  return getPasswordRecoveryErrorMessage(error, "reset");
}

let refreshSessionPromise: Promise<AuthenticatedUser> | null = null;

async function getCsrfToken(): Promise<string> {
  const response = await api.get<CsrfResponse>("/auth/csrf");
  return response.data.csrf_token;
}

export function refreshAuthSession(): Promise<AuthenticatedUser> {
  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      const csrfToken = await getCsrfToken();
      const response = await api.post<LoginResponse>(
        "/auth/refresh",
        undefined,
        { headers: { "X-CSRF-Token": csrfToken } },
      );
      setAccessToken(response.data.access_token);
      return response.data.user;
    })().finally(() => {
      refreshSessionPromise = null;
    });
  }

  return refreshSessionPromise;
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken();
  await api.post(
    "/auth/logout",
    undefined,
    { headers: { "X-CSRF-Token": csrfToken } },
  );
  setAccessToken(null);
}

export function getLoginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return "We couldn't sign you in. Please try again.";
  }

  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return "The server took too long to respond. Please try again.";
    }

    return "Couldn't reach the server. Check your connection and try again.";
  }

  if (error.response.status === 401) {
    return "Email or password is incorrect.";
  }

  if (error.response.status === 429) {
    return "Too many sign-in attempts. Please wait before trying again.";
  }

  if (error.response.status === 422) {
    return "Enter a valid email address and password.";
  }

  return "We couldn't sign you in right now. Please try again later.";
}

export async function registerCustomer(
  payload: RegisterCustomerRequest,
): Promise<RegisteredUser> {
  const response = await api.post<RegisteredUser>("/auth/register", payload);
  return response.data;
}

export function getRegistrationErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return "We couldn't create your account. Please try again.";
  }

  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return "The server took too long to respond. Please try again.";
    }

    return "Couldn't reach the server. Check your connection and try again.";
  }

  if (error.response.status === 409) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (error.response.status === 422) {
    return "Check your name, email address, and password requirements.";
  }

  const detail = error.response.data?.detail;
  if (typeof detail === "string" && error.response.status < 500) {
    return detail;
  }

  return "We couldn't create your account right now. Please try again later.";
}
