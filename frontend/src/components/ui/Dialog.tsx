import { type ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { t } from "@/i18n";
import { Button } from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/60 bg-bg-secondary rounded-xl border border-border-primary shadow-2xl p-0 w-full max-w-md text-text-primary"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
          <X size={18} />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
      {actions && <div className="flex justify-end gap-3 border-t border-border-primary px-5 py-3">{actions}</div>}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  variant = "danger",
  loading,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel ?? t("confirm")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{message}</p>
    </Dialog>
  );
}
