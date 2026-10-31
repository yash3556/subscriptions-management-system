import { Check, Circle } from "lucide-react";

export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;

interface PasswordRequirementsProps {
  password: string;
}

const requirements = [
  {
    label: "More than 8 characters",
    test: (password: string) => password.length > 8,
  },
  {
    label: "At least one uppercase letter (A–Z)",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: "At least one lowercase letter (a–z)",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: "At least one special character",
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
];

export function PasswordRequirements({
  password,
}: PasswordRequirementsProps) {
  return (
    <ul
      aria-label="Password requirements"
      className="mt-2 space-y-1.5"
      aria-live="polite"
    >
      {requirements.map(({ label, test }) => {
        const satisfied = test(password);
        const Icon = satisfied ? Check : Circle;

        return (
          <li
            className={`flex items-center gap-2 text-xs ${
              satisfied ? "text-emerald-700" : "text-slate-500"
            }`}
            key={label}
          >
            <Icon aria-hidden="true" size={14} />
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
