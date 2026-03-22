import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { signIn as cognitoSignIn, refreshSession, type AuthTokens } from "./cognito";

const STORAGE_KEY = "wh_auth_tokens";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  idToken: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredTokens(): AuthTokens | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AuthTokens;
  } catch {
    return null;
  }
}

function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function clearStoredTokens(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt to restore session on mount
  useEffect(() => {
    const stored = loadStoredTokens();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    // If token is still valid (with 60s buffer), use it directly
    if (stored.expiresAt > Date.now() + 60_000) {
      setTokens(stored);
      setIsLoading(false);
      return;
    }

    // Try to refresh
    refreshSession(stored.refreshToken)
      .then((newTokens) => {
        storeTokens(newTokens);
        setTokens(newTokens);
      })
      .catch(() => {
        clearStoredTokens();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!tokens) return;

    const msUntilRefresh = tokens.expiresAt - Date.now() - 5 * 60_000; // 5 min before expiry
    if (msUntilRefresh <= 0) return;

    const timer = setTimeout(() => {
      refreshSession(tokens.refreshToken)
        .then((newTokens) => {
          storeTokens(newTokens);
          setTokens(newTokens);
        })
        .catch(() => {
          clearStoredTokens();
          setTokens(null);
        });
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  }, [tokens]);

  const handleSignIn = useCallback(async (username: string, password: string) => {
    const newTokens = await cognitoSignIn(username, password);
    storeTokens(newTokens);
    setTokens(newTokens);
  }, []);

  const handleSignOut = useCallback(() => {
    clearStoredTokens();
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
