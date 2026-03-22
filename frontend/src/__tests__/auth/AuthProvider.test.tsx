import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";

// Mock the Cognito module
vi.mock("@/auth/cognito", () => ({
  signIn: vi.fn(),
  refreshSession: vi.fn(),
}));

import * as cognito from "@/auth/cognito";

const STORAGE_KEY = "wh_auth_tokens";

function AuthDisplay() {
  const { isAuthenticated, isLoading, idToken, signIn, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="authed">{isAuthenticated ? "yes" : "no"}</span>
      <span data-testid="token">{idToken ?? "null"}</span>
      <button onClick={() => signIn("user", "pass")}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(cognito.signIn).mockReset();
    vi.mocked(cognito.refreshSession).mockReset();
  });

  it("starts unauthenticated with no stored tokens", async () => {
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    });
    expect(screen.getByTestId("authed")).toHaveTextContent("no");
    expect(screen.getByTestId("token")).toHaveTextContent("null");
  });

  it("restores session from localStorage when token is still valid", async () => {
    const storedTokens = {
      idToken: "stored-id-token",
      accessToken: "stored-access-token",
      refreshToken: "stored-refresh-token",
      expiresAt: Date.now() + 3600_000, // 1 hour from now
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedTokens));

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      expect(screen.getByTestId("authed")).toHaveTextContent("yes");
      expect(screen.getByTestId("token")).toHaveTextContent("stored-id-token");
    });
  });

  it("attempts token refresh when stored token is near expiry", async () => {
    const storedTokens = {
      idToken: "old-token",
      accessToken: "old-access",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 30_000, // 30s from now (within 60s buffer)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedTokens));

    const refreshedTokens = {
      idToken: "refreshed-id-token",
      accessToken: "refreshed-access",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600_000,
    };
    vi.mocked(cognito.refreshSession).mockResolvedValue(refreshedTokens);

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      expect(screen.getByTestId("authed")).toHaveTextContent("yes");
      expect(screen.getByTestId("token")).toHaveTextContent("refreshed-id-token");
    });

    expect(cognito.refreshSession).toHaveBeenCalledWith("refresh-token");
  });

  it("clears stored tokens when refresh fails", async () => {
    const storedTokens = {
      idToken: "old-token",
      accessToken: "old-access",
      refreshToken: "bad-refresh",
      expiresAt: Date.now() + 30_000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedTokens));

    vi.mocked(cognito.refreshSession).mockRejectedValue(new Error("Refresh failed"));

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      expect(screen.getByTestId("authed")).toHaveTextContent("no");
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("signs in successfully and stores tokens", async () => {
    const newTokens = {
      idToken: "new-id-token",
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: Date.now() + 3600_000,
    };
    vi.mocked(cognito.signIn).mockResolvedValue(newTokens);

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    });

    await user.click(screen.getByText("Sign In"));

    await waitFor(() => {
      expect(screen.getByTestId("authed")).toHaveTextContent("yes");
      expect(screen.getByTestId("token")).toHaveTextContent("new-id-token");
    });

    // Verify tokens are stored
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.idToken).toBe("new-id-token");
  });

  it("signs out and clears tokens", async () => {
    const tokens = {
      idToken: "id-token",
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: Date.now() + 3600_000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authed")).toHaveTextContent("yes");
    });

    await user.click(screen.getByText("Sign Out"));

    await waitFor(() => {
      expect(screen.getByTestId("authed")).toHaveTextContent("no");
      expect(screen.getByTestId("token")).toHaveTextContent("null");
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    function Orphan() {
      useAuth();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow("useAuth must be used within AuthProvider");
  });

  it("handles corrupted localStorage gracefully", async () => {
    localStorage.setItem(STORAGE_KEY, "not valid json{{{");

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
      expect(screen.getByTestId("authed")).toHaveTextContent("no");
    });
  });
});
