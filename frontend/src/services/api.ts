import axios from "axios";

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1",
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      accessToken &&
      typeof window !== "undefined" &&
      !/\/auth\/(login|refresh|register|forgot-password|reset-password)(?:\?|$)/.test(
        error.config?.url ?? "",
      )
    ) {
      accessToken = null;
      window.dispatchEvent(new Event("brightloop:session-expired"));
    }
    return Promise.reject(error);
  },
);