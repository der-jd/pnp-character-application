import { clsx } from "clsx";
import { t } from "@/i18n";

interface PasswordStrengthBarProps {
  password: string;
}

type Strength = 0 | 1 | 2 | 3 | 4;

function getPasswordStrength(password: string): Strength {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return 1;
  if (score <= 2) return 2;
  if (score <= 3) return 3;
  return 4;
}

const strengthConfig: Record<Strength, { label: () => string; color: string }> = {
  0: { label: () => "", color: "bg-border-primary" },
  1: { label: () => t("passwordStrengthWeak"), color: "bg-accent-danger" },
  2: { label: () => t("passwordStrengthFair"), color: "bg-orange-500" },
  3: { label: () => t("passwordStrengthGood"), color: "bg-yellow-500" },
  4: { label: () => t("passwordStrengthStrong"), color: "bg-green-500" },
};

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const strength = getPasswordStrength(password);
  const config = strengthConfig[strength];

  if (!password) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {([1, 2, 3, 4] as const).map((level) => (
          <div
            key={level}
            className={clsx(
              "h-1 flex-1 rounded-full transition-colors",
              strength >= level ? config.color : "bg-border-primary",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-text-muted">{config.label()}</p>
    </div>
  );
}
