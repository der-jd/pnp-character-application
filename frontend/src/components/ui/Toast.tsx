import { createContext, useContext, useCallback, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const typeStyles: Record<ToastType, string> = {
  success: "border-accent-success/30 bg-accent-success/10",
  error: "border-accent-danger/30 bg-accent-danger/10",
  info: "border-accent-info/30 bg-accent-info/10",
};

const iconColors: Record<ToastType, string> = {
  success: "text-accent-success",
  error: "text-accent-danger",
  info: "text-accent-info",
};

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const Icon = icons[toast.type];
  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-lg border p-3 shadow-lg animate-in slide-in-from-right",
        typeStyles[toast.type],
      )}
    >
      <Icon size={18} className={clsx("mt-0.5 shrink-0", iconColors[toast.type])} />
      <p className="text-sm text-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-text-muted hover:text-text-primary shrink-0 cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
