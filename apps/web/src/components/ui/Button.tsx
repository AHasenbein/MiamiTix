import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--foreground)] text-[var(--background)] hover:bg-zinc-200 max-md:min-h-12",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-zinc-800 hover:border-zinc-600 max-md:min-h-12",
  ghost:
    "bg-transparent text-[var(--silver)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] max-md:min-h-12",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 max-md:min-h-12"
};

interface ButtonClassOptions {
  variant?: ButtonVariant;
  className?: string;
}

export function getButtonClassName({
  variant = "primary",
  className = ""
}: ButtonClassOptions = {}): string {
  return `inline-flex h-11 items-center whitespace-nowrap justify-center rounded-[var(--radius-md)] px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60 max-md:touch-manipulation ${variantClasses[variant]} ${className}`;
}

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={getButtonClassName({ variant, className })}
      {...props}
    >
      {children}
    </button>
  );
}
