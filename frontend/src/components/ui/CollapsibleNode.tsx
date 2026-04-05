import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleNode({
  label,
  defaultExpanded = false,
  compact = false,
  children,
}: {
  label: ReactNode;
  defaultExpanded?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={`flex items-center font-medium text-text-secondary hover:text-text-primary cursor-pointer select-none ${compact ? "gap-1" : "gap-1.5"}`}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {label}
      </button>
      {expanded && (
        <div
          className={`ml-4 border-l border-border-primary ${compact ? "pl-3 mt-0.5 space-y-0.5" : "pl-3 mt-1 space-y-1"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
