import { type InputHTMLAttributes, forwardRef, useState } from "react";
import { clsx } from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { t } from "@/i18n";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, type, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={clsx(
              "w-full rounded-md border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-muted transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-border-focus focus:border-border-focus",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isPassword && "pr-10",
              error ? "border-accent-danger" : "border-border-primary",
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-accent-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
