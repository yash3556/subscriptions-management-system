import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface AuthSubmitButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: ReactNode;
}

export function AuthSubmitButton({
  isLoading = false,
  children,
  disabled,
  ...buttonProps
}: AuthSubmitButtonProps) {
  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled || isLoading}
      {...buttonProps}
    >
      {isLoading && (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
      )}
      {isLoading ? "Please wait…" : children}
    </button>
  );
}
