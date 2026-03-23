import { type InputHTMLAttributes } from "react";
import { clsx } from "clsx";

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  checked: boolean;
  onChange: () => void;
}

export function Toggle({ label, className, checked, onChange, ...props }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={clsx(
          "relative w-8 h-[18px] appearance-none rounded-full transition-colors",
          "bg-bg-tertiary checked:bg-accent-primary",
          "cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary focus:ring-accent-primary",
          "after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-3 after:h-3 after:rounded-full after:bg-white after:transition-transform",
          "checked:after:translate-x-[14px]",
          className,
        )}
        {...props}
      />
      {label && <span className="text-sm text-text-primary">{label}</span>}
    </label>
  );
}
