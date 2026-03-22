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

const REFRESH_TOKEN_KEY = "wh_auth_refresh";
const OLD_STORAGE_KEY = "wh_auth_tokens";

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

  it("restores session from localStorage using stored refresh token", async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "stored-refresh-token");

    const refreshedTokens = {
      idToken: "restored-id-token",
      accessToken: "restored-access-token",
      refreshToken: "stored-refresh-token",
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
      expect(screen.getByTestId("token")).toHaveTextContent("restored-id-token");
    });

    expect(cognito.refreshSession).toHaveBeenCalledWith("stored-refresh-token");
  });

  it("clears stored refresh token when session restore fails", async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "bad-refresh");

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

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it("signs in successfully and stores only the refresh token", async () => {
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

    // Only the refresh token is persisted; id/access tokens are in memory only
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("new-refresh");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).not.toContain("new-id-token");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).not.toContain("new-access");
  });

  it("signs out and clears stored refresh token", async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-token");

    vi.mocked(cognito.refreshSession).mockResolvedValue({
      idToken: "id-token",
      accessToken: "access",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600_000,
    });

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

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it("migrates away from old token storage format on mount", async () => {
    const oldTokens = {
      idToken: "old-id",
      accessToken: "old-access",
      refreshToken: "old-refresh",
      expiresAt: Date.now() + 3600_000,
    };
    localStorage.setItem(OLD_STORAGE_KEY, JSON.stringify(oldTokens));

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    });

    expect(localStorage.getItem(OLD_STORAGE_KEY)).toBeNull();
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    function Orphan() {
      useAuth();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow("useAuth must be used within AuthProvider");
  });
});
