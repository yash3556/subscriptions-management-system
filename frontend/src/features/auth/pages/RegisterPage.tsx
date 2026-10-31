import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { AuthSubmitButton } from "../components/AuthSubmitButton";
import { AuthTextField } from "../components/AuthTextField";
import { PasswordField } from "../components/PasswordField";
import {
  PASSWORD_PATTERN,
  PasswordRequirements,
} from "../components/PasswordRequirements";
import {
  getRegistrationErrorMessage,
  registerCustomer,
} from "../../../services/authService";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setRegistrationError("");
    setIsRegistered(false);

    const validName = Boolean(name.trim());
    const validEmail =
      Boolean(email.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validPassword = PASSWORD_PATTERN.test(password);
    const matchingPasswords =
      Boolean(confirmPassword) && password === confirmPassword;

    if (!validName || !validEmail || !validPassword || !matchingPasswords) {
      return;
    }

    setIsLoading(true);
    try {
      await registerCustomer({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setIsRegistered(true);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setRegistrationError(getRegistrationErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

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
        <AuthSubmitButton isLoading={isLoading} type="submit">
          Create account
        </AuthSubmitButton>
        {registrationError && (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {registrationError}
          </p>
        )}
        {isRegistered && (
          <div
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"
            role="status"
          >
            Account created. You can now{" "}
            <Link className="font-semibold underline" to="/login">
              sign in
            </Link>
            .
          </div>
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
