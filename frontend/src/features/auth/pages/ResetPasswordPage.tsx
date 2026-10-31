import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { FormNotice } from "../components/FormNotice";
import { PasswordField } from "../components/PasswordField";
import {
  PASSWORD_PATTERN,
  PasswordRequirements,
} from "../components/PasswordRequirements";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <AuthLayout
      description="Choose a new password that meets all the requirements."
      title="Reset password"
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
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
        <AuthSubmitButton type="submit">Reset password</AuthSubmitButton>
        {submitted && !passwordError && !confirmPasswordError && (
          <FormNotice>
            Password reset is not connected yet. No password was changed.
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
