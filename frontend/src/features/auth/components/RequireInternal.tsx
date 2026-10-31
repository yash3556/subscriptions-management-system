import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

interface RequireInternalProps {
  children: ReactNode;
  permission?: string;
  adminOnly?: boolean;
}

export function RequireInternal({
  children,
  permission,
  adminOnly = false,
}: RequireInternalProps) {
  const { user, status, error, retrySession } = useAuth();

  if (status === "loading") {
    return (
      <main
        aria-live="polite"
        className="grid min-h-screen place-items-center text-sm text-slate-600"
      >
        Verifying your session…
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center">
          <p className="text-sm text-red-800" role="alert">
            {error}
          </p>
          <button
            className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            onClick={() => void retrySession()}
            type="button"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (status !== "authenticated" || !user) {
    return <Navigate replace to="/login" />;
  }

  if (user.role === "CUSTOMER") {
    return <Navigate replace to="/portal" />;
  }

  if (adminOnly && user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  if (
    permission &&
    user.role !== "ADMIN" &&
    !user.permissions.includes(permission)
  ) {
    return <AccessDenied />;
  }

  return children;
}

export function AccessDenied() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
        <h1 className="font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account does not have permission to view this page.
        </p>
      </div>
    </main>
  );
}
