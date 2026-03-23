import { type InputHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={clsx(
          "w-full rounded-md border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-muted transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-accent-danger" : "border-border-primary",
          className,
        )}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-accent-danger">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";
