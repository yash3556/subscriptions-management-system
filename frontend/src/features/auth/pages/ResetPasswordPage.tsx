import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { FormNotice } from "../components/FormNotice";
import { PasswordField } from "../components/PasswordField";
import {
  PASSWORD_PATTERN,
  PasswordRequirements,
} from "../components/PasswordRequirements";
import {
  getResetPasswordErrorMessage,
  resetPassword,
} from "../../../services/authService";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [resetError, setResetError] = useState("");

  const passwordError =
    submitted && !PASSWORD_PATTERN.test(password)
      ? "Password does not meet all the requirements."
      : "";
  const confirmPasswordError =
    submitted && !confirmPassword
      ? "Please confirm your password."
      : submitted && password !== confirmPassword
        ? "Passwords do not match."
        : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setResetComplete(false);
    setResetError("");

    if (!token || !PASSWORD_PATTERN.test(password) || password !== confirmPassword) {
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({ token, new_password: password });
      setResetComplete(true);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setResetError(getResetPasswordErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      description="Choose a new password that meets all the requirements."
      title="Reset password"
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        {!token && (
          <p
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
            role="alert"
          >
            This reset link is missing its token. Request a new password reset
            link to continue.
          </p>
        )}
        <div>
          <PasswordField
            autoComplete="new-password"
            error={passwordError}
            id="reset-password"
            label="New password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            value={password}
          />
          <PasswordRequirements password={password} />
        </div>
        <PasswordField
          autoComplete="new-password"
          error={confirmPasswordError}
          id="reset-confirm-password"
          label="Confirm new password"
          name="confirmPassword"
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          value={confirmPassword}
        />
        <AuthSubmitButton disabled={!token || resetComplete} isLoading={isLoading} type="submit">
          Reset password
        </AuthSubmitButton>
        {resetError && (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {resetError}
          </p>
        )}
        {resetComplete && (
          <FormNotice>
            Password reset successfully. You can now sign in with your new
            password.
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
