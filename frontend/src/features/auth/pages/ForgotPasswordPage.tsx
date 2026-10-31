import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { AuthTextField } from "../components/AuthTextField";
import { FormNotice } from "../components/FormNotice";
import {
  getForgotPasswordErrorMessage,
  requestPasswordReset,
} from "../../../services/authService";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState("");

  const emailError = submitted
    ? !email.trim()
      ? "Email is required."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "Enter a valid email address."
        : ""
    : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setRequestSent(false);
    setRequestError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setRequestSent(true);
    } catch (error) {
      setRequestError(getForgotPasswordErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
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
          onChange={(event) => {
            setEmail(event.target.value);
            setRequestSent(false);
            setRequestError("");
          }}
          placeholder="you@company.com"
          required
          type="email"
          value={email}
        />
        <AuthSubmitButton isLoading={isLoading} type="submit">
          Continue
        </AuthSubmitButton>
        {requestError && (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {requestError}
          </p>
        )}
        {requestSent && (
          <FormNotice>
            If an account exists for this email, a password reset link will be
            sent. Check your inbox.
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
