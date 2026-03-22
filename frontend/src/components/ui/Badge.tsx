import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-bg-tertiary text-text-secondary border-border-primary",
  success: "bg-accent-success/10 text-accent-success border-accent-success/20",
  warning: "bg-accent-warning/10 text-accent-warning border-accent-warning/20",
  danger: "bg-accent-danger/10 text-accent-danger border-accent-danger/20",
  info: "bg-accent-info/10 text-accent-info border-accent-info/20",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
