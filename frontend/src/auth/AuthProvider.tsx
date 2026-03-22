import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { signIn as cognitoSignIn, refreshSession, type AuthTokens } from "./cognito";

// Only the refresh token is persisted to localStorage.
// Short-lived id/access tokens are kept in memory only to limit XSS exposure.
const REFRESH_TOKEN_KEY = "wh_auth_refresh";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  idToken: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadRefreshToken(): string | null {
  try {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    return stored ?? null;
  } catch {
    return null;
  }
}

function storeRefreshToken(refreshToken: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt to restore session on mount using stored refresh token
  useEffect(() => {
    const refreshToken = loadRefreshToken();
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }

    refreshSession(refreshToken)
      .then((newTokens) => {
        setTokens(newTokens);
      })
      .catch(() => {
        clearRefreshToken();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Auto-refresh id/access tokens before expiry
  useEffect(() => {
    if (!tokens) return;

    const msUntilRefresh = tokens.expiresAt - Date.now() - 5 * 60_000; // 5 min before expiry
    if (msUntilRefresh <= 0) return;

    const timer = setTimeout(() => {
      refreshSession(tokens.refreshToken)
        .then((newTokens) => {
          setTokens(newTokens);
        })
        .catch(() => {
          clearRefreshToken();
          setTokens(null);
        });
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  }, [tokens]);

  const handleSignIn = useCallback(async (username: string, password: string) => {
    const newTokens = await cognitoSignIn(username, password);
    storeRefreshToken(newTokens.refreshToken); // only refresh token persisted
    setTokens(newTokens); // id/access tokens in memory only
  }, []);

  const handleSignOut = useCallback(() => {
    clearRefreshToken();
    setTokens(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: tokens !== null,
        isLoading,
        idToken: tokens?.idToken ?? null,
        signIn: handleSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
