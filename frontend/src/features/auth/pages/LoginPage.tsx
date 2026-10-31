import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { AuthTextField } from "../components/AuthTextField";
import { FormNotice } from "../components/FormNotice";
import { PasswordField } from "../components/PasswordField";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailError = submitted
    ? !email.trim()
      ? "Email is required."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "Enter a valid email address."
        : ""
    : "";
  const passwordError =
    submitted && !password ? "Password is required." : "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
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
          onChange={(event) => setEmail(event.target.value)}
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
            onChange={(event) => setPassword(event.target.value)}
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
        <AuthSubmitButton type="submit">Sign in</AuthSubmitButton>
        {submitted && !emailError && !passwordError && (
          <FormNotice>
            Authentication is not connected yet. No credentials were sent.
          </FormNotice>
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
