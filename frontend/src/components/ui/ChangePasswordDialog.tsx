import { useState, type FormEvent, useEffect } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { t } from "@/i18n";
import { Dialog } from "./Dialog";
import { Input } from "./Input";
import { Button } from "./Button";
import { PasswordStrengthBar } from "./PasswordStrengthBar";
import { useToast } from "./Toast";

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Validates the proposed password against the Cognito pool policy:
 * min 16 chars, uppercase, lowercase, digit, special character.
 */
function isValidPassword(password: string): boolean {
  return (
    password.length >= 16 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const { changePassword } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPasswordError("");
      setNewPasswordError("");
      setConfirmPasswordError("");
      setLoading(false);
    }
  }, [open]);

  function validate(): boolean {
    let valid = true;

    if (!currentPassword) {
      setCurrentPasswordError(t("fieldRequired"));
      valid = false;
    } else {
      setCurrentPasswordError("");
    }

    if (!isValidPassword(newPassword)) {
      setNewPasswordError(t("newPasswordInvalid"));
      valid = false;
    } else {
      setNewPasswordError("");
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError(t("newPasswordMismatch"));
      valid = false;
    } else {
      setConfirmPasswordError("");
    }

    return valid;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast("success", t("changePasswordSuccess"));
      onClose();
    } catch (err) {
      const errorString = err instanceof Error ? `${err.name}: ${err.message}` : "";
      if (errorString.includes("NotAuthorizedException")) {
        setCurrentPasswordError(t("changePasswordWrongCurrent"));
      } else if (errorString.includes("InvalidPasswordException")) {
        setNewPasswordError(t("newPasswordInvalid"));
      } else if (errorString.includes("LimitExceededException")) {
        setCurrentPasswordError(t("changePasswordLimitExceeded"));
      } else {
        setCurrentPasswordError(t("changePasswordError"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("changePassword")}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button type="submit" form="change-password-form" loading={loading}>
            {loading ? t("changingPassword") : t("changePassword")}
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label={t("currentPassword")}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          error={currentPasswordError}
          required
          autoFocus
        />
        <div>
          <Input
            label={t("newPassword")}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            error={newPasswordError}
            required
          />
          <div className="mt-1.5">
            <PasswordStrengthBar password={newPassword} />
          </div>
        </div>
        <Input
          label={t("confirmNewPassword")}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          error={confirmPasswordError}
          required
        />
        <p className="text-xs text-text-muted">{t("passwordRequirements")}</p>
      </form>
    </Dialog>
  );
}
