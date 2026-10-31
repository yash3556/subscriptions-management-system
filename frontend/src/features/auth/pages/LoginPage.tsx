import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { AuthTextField } from "../components/AuthTextField";
import { PasswordField } from "../components/PasswordField";
import {
  getLoginErrorMessage,
} from "../../../services/authService";
import { useAuth } from "../../../hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const emailError = submitted
    ? !email.trim()
      ? "Email is required."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "Enter a valid email address."
        : ""
    : "";
  const passwordError =
    submitted && !password ? "Password is required." : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const validEmail =
      Boolean(email.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validEmail || !password) {
      return;
    }

    setLoginError("");
    setIsLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      const staffLanding = [
        ["reports:read", "/app/dashboard"],
        ["customers:read", "/app/customers"],
        ["products:read", "/app/products"],
        ["plans:read", "/app/plans"],
        ["quotations:read", "/app/quotations"],
        ["subscriptions:read", "/app/subscriptions"],
        ["invoices:read", "/app/invoices"],
        ["payments:read", "/app/payments"],
        ["discounts:read", "/app/discounts"],
      ].find(([permission]) => user.permissions.includes(permission));
      const destination =
        user.role === "CUSTOMER"
          ? "/portal"
          : user.role === "ADMIN"
            ? "/app/dashboard"
            : staffLanding?.[1] ?? "/app/no-access";
      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      setLoginError(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      description="Sign in to continue to your workspace."
      title="Welcome back"
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="email"
          error={emailError}
          id="login-email"
          label="Email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
            setLoginError("");
          }}
          placeholder="you@company.com"
          required
          type="email"
          value={email}
        />
        <div>
          <PasswordField
            autoComplete="current-password"
            error={passwordError}
            id="login-password"
            label="Password"
            name="password"
            onChange={(event) => {
              setPassword(event.target.value);
              setLoginError("");
            }}
            required
            value={password}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                checked={rememberMe}
                className="size-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                name="remember-me"
                onChange={(event) => setRememberMe(event.target.checked)}
                type="checkbox"
              />
              Remember me
            </label>
            <Link
              className="text-sm font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              to="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <AuthSubmitButton isLoading={isLoading} type="submit">
          Sign in
        </AuthSubmitButton>
        {loginError && (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {loginError}
          </p>
        )}
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Don’t have an account?{" "}
        <Link
          className="font-medium text-blue-700 hover:text-blue-800"
          to="/register"
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
