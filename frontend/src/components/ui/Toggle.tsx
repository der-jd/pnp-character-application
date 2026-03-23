import { type InputHTMLAttributes } from "react";
import { clsx } from "clsx";

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export function Toggle({ label, className, ...props }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        className={clsx(
          "relative w-10 h-6 appearance-none rounded-full transition-colors",
          "bg-bg-tertiary checked:bg-accent-primary",
          "cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary focus:ring-accent-primary",
          "after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform",
          "checked:after:translate-x-4",
          className,
        )}
        {...props}
      />
      {label && <span className="text-sm text-text-primary">{label}</span>}
    </label>
  );
}
