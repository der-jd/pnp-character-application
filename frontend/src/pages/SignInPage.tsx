import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { isValidPassword } from "@/auth/passwordPolicy";
import { t } from "@/i18n";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PasswordStrengthBar } from "@/components/ui/PasswordStrengthBar";

export function SignInPage() {
  const { signIn, completeNewPassword, newPasswordRequired } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn(username, password);
      if (!result.newPasswordRequired) {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("network")) {
        setError(t("signInErrorNetwork"));
      } else {
        setError(t("signInError"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!isValidPassword(newPassword)) {
      setError(t("newPasswordInvalid"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("newPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await completeNewPassword(newPassword);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errorString = err instanceof Error ? `${err.name}: ${err.message}` : "";
      if (errorString.includes("InvalidPasswordException")) {
        setError(t("newPasswordInvalid"));
      } else if (errorString.includes("LimitExceededException")) {
        setError(t("changePasswordLimitExceeded"));
      } else {
        setError(t("newPasswordError"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 bg-bg-primary p-4 flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary text-white font-bold text-xl">
            WH
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{t("appName")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("appSubtitle")}</p>
        </div>

        {newPasswordRequired ? (
          /* New Password Form */
          <form
            onSubmit={handleNewPassword}
            className="rounded-xl border border-border-primary bg-bg-secondary p-6 space-y-4"
            noValidate
          >
            <p className="text-sm text-text-secondary">{t("newPasswordDescription")}</p>
            <div>
              <Input
                label={t("newPassword")}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                autoFocus
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
              required
            />

            {error && (
              <div className="rounded-lg border border-accent-danger/30 bg-accent-danger/10 px-3 py-2">
                <p className="text-sm text-accent-danger">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? t("settingNewPassword") : t("setNewPassword")}
            </Button>
          </form>
        ) : (
          /* Sign In Form */
          <form
            onSubmit={handleSignIn}
            className="rounded-xl border border-border-primary bg-bg-secondary p-6 space-y-4"
            noValidate
          >
            <Input
              label={t("username")}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
            <Input
              label={t("password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="rounded-lg border border-accent-danger/30 bg-accent-danger/10 px-3 py-2">
                <p className="text-sm text-accent-danger">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
