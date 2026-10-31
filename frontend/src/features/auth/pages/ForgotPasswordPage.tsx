import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { AuthTextField } from "../components/AuthTextField";
import { FormNotice } from "../components/FormNotice";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const emailError = submitted
    ? !email.trim()
      ? "Email is required."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "Enter a valid email address."
        : ""
    : "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <AuthLayout
      description="Enter your email address to continue with password recovery."
      title="Forgot password?"
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="email"
          error={emailError}
          id="forgot-email"
          label="Email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
          type="email"
          value={email}
        />
        <AuthSubmitButton type="submit">Continue</AuthSubmitButton>
        {submitted && !emailError && (
          <FormNotice>
            Password recovery is not connected yet. No request was sent.
          </FormNotice>
        )}
      </form>
      <p className="mt-6 text-center">
        <Link
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
          to="/login"
        >
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
