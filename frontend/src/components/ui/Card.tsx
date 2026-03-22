import type { ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
}

export function Card({ children, className, title, actions }: CardProps) {
  return (
    <div className={clsx("rounded-lg border border-border-primary bg-bg-secondary", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-border-primary px-5 py-3">
          {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
