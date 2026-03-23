import { type SelectHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={clsx(
            "w-full rounded-md border bg-bg-secondary px-3 py-2 text-sm text-text-primary transition-colors appearance-none",
            "focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-accent-danger" : "border-border-primary",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-accent-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
