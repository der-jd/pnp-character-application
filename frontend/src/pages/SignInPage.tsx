import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { t } from "@/i18n";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(import.meta.env.VITE_TEST_USER_EMAIL || "");
  const [password, setPassword] = useState(import.meta.env.VITE_TEST_USER_PASSWORD || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(username, password);
      navigate("/dashboard", { replace: true });
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-primary text-white font-bold text-xl">
            WH
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{t("appName")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("appSubtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-border-primary bg-bg-secondary p-6 space-y-4">
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
      </div>
    </div>
  );
}
