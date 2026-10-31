import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { AuthTextField } from "../components/AuthTextField";
import { FormNotice } from "../components/FormNotice";
import { PasswordField } from "../components/PasswordField";
import {
  PASSWORD_PATTERN,
  PasswordRequirements,
} from "../components/PasswordRequirements";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !name.trim() ? "Name is required." : "";
  const emailError = submitted
    ? !email.trim()
      ? "Email is required."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "Enter a valid email address."
        : ""
    : "";
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

  const hasErrors =
    Boolean(nameError || emailError || passwordError || confirmPasswordError);

  return (
    <AuthLayout
      description="Create an account to get started."
      title="Create your account"
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="name"
          error={nameError}
          id="register-name"
          label="Name"
          name="name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          required
          value={name}
        />
        <AuthTextField
          autoComplete="email"
          error={emailError}
          id="register-email"
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
            autoComplete="new-password"
            error={passwordError}
            id="register-password"
            label="Password"
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
          id="register-confirm-password"
          label="Confirm password"
          name="confirmPassword"
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          value={confirmPassword}
        />
        <AuthSubmitButton type="submit">Create account</AuthSubmitButton>
        {submitted && !hasErrors && (
          <FormNotice>
            Registration is not connected yet. No account was created.
          </FormNotice>
        )}
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          className="font-medium text-blue-700 hover:text-blue-800"
          to="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
