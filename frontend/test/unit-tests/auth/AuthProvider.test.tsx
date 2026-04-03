import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";

// Mock the Cognito module
vi.mock("@/auth/cognito", () => ({
  signIn: vi.fn(),
  completeNewPassword: vi.fn(),
  changePassword: vi.fn(),
  refreshSession: vi.fn(),
  isNewPasswordChallenge: vi.fn((result: unknown) => {
    return (
      typeof result === "object" &&
      result !== null &&
      "type" in result &&
      (result as { type: string }).type === "NEW_PASSWORD_REQUIRED"
    );
  }),
}));

import * as cognito from "@/auth/cognito";

const REFRESH_TOKEN_KEY = "wh_auth_refresh";

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: Wrapper });
}

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
    vi.mocked(cognito.completeNewPassword).mockReset();
    vi.mocked(cognito.changePassword).mockReset();
    vi.mocked(cognito.refreshSession).mockReset();
  });

  it("starts unauthenticated with no stored tokens", async () => {
    renderWithProviders(
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

    renderWithProviders(
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

    renderWithProviders(
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
    renderWithProviders(
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

  it("signs out and clears stored refresh token and query cache", async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-token");

    vi.mocked(cognito.refreshSession).mockResolvedValue({
      idToken: "id-token",
      accessToken: "access",
      refreshToken: "refresh-token",
      expiresAt: Date.now() + 3600_000,
    });

    const testQueryClient = createTestQueryClient();
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>
          <AuthDisplay />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authed")).toHaveTextContent("yes");
    });

    // Seed the query cache with data that would have been fetched while signed in
    testQueryClient.setQueryData(["characters"], { characters: [{ id: "char-1" }] });
    expect(testQueryClient.getQueryData(["characters"])).toBeDefined();

    await user.click(screen.getByText("Sign Out"));

    await waitFor(() => {
      expect(screen.getByTestId("authed")).toHaveTextContent("no");
      expect(screen.getByTestId("token")).toHaveTextContent("null");
    });

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(testQueryClient.getQueryData(["characters"])).toBeUndefined();
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    function Orphan() {
      useAuth();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow("useAuth must be used within AuthProvider");
  });
});
