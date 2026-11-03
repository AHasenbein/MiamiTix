import { useId } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  errorMessage?: string;
  helperText?: string;
}

export function Input({
  label,
  className = "",
  errorMessage,
  helperText,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const hasError = Boolean(errorMessage);
  const describedBy = [hasError ? errorId : "", !hasError && helperText ? helperId : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-[13px] font-medium text-[var(--silver)]">{label}</span>
      <input
        id={inputId}
        aria-invalid={hasError}
        aria-describedby={describedBy || undefined}
        className={`h-11 rounded-[var(--radius-md)] border bg-[var(--background)] px-3 text-[var(--foreground)] outline-none transition placeholder:text-zinc-600 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] ${
          hasError ? "border-red-400/50" : "border-[var(--border)]"
        } ${className}`}
        {...props}
      />
      {errorMessage ? (
        <span className="text-xs text-danger" id={errorId}>
          {errorMessage}
        </span>
      ) : null}
      {!errorMessage && helperText ? (
        <span className="muted-text text-xs" id={helperId}>
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
