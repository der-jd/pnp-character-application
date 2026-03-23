import { t } from "@/i18n";
import { Button } from "./Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-20">
      <p className="text-accent-danger mb-4">{message ?? t("toastLoadError")}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
