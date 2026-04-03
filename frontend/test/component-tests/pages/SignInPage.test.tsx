import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import { SignInPage } from "@/pages/SignInPage";

// Mock the auth module
const mockSignIn = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isAuthenticated: false,
    isLoading: false,
    idToken: null,
    signOut: vi.fn(),
    newPasswordRequired: false,
    completeNewPassword: vi.fn(),
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderSignIn() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <SignInPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("SignInPage", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockNavigate.mockReset();
  });

  it("renders the login form", () => {
    renderSignIn();
    expect(screen.getByText("World Hoppers")).toBeInTheDocument();
    expect(screen.getByLabelText("Benutzername")).toBeInTheDocument();
    expect(screen.getByLabelText("Passwort")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anmelden" })).toBeInTheDocument();
  });

  it("allows typing in username and password fields", async () => {
    const user = userEvent.setup();
    renderSignIn();

    const usernameInput = screen.getByLabelText("Benutzername");
    const passwordInput = screen.getByLabelText("Passwort");

    await user.type(usernameInput, "testuser");
    await user.type(passwordInput, "password123");

    expect(usernameInput).toHaveValue("testuser");
    expect(passwordInput).toHaveValue("password123");
  });

  it("calls signIn and navigates on successful submission", async () => {
    mockSignIn.mockResolvedValue({ newPasswordRequired: false });
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText("Benutzername"), "testuser");
    await user.type(screen.getByLabelText("Passwort"), "password123");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("testuser", "password123");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
    });
  });

  it("shows error message on failed sign-in", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText("Benutzername"), "wrong");
    await user.type(screen.getByLabelText("Passwort"), "wrong");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => {
      expect(screen.getByText("Anmeldung fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.")).toBeInTheDocument();
    });
  });

  it("shows network error message for network failures", async () => {
    mockSignIn.mockRejectedValue(new Error("network error occurred"));
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText("Benutzername"), "user");
    await user.type(screen.getByLabelText("Passwort"), "pass");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => {
      expect(screen.getByText("Netzwerkfehler. Bitte versuche es erneut.")).toBeInTheDocument();
    });
  });

  it("shows loading state while signing in", async () => {
    // Make signIn hang
    mockSignIn.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText("Benutzername"), "user");
    await user.type(screen.getByLabelText("Passwort"), "pass");
    await user.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => {
      expect(screen.getByText("Anmeldung läuft...")).toBeInTheDocument();
    });
  });
});
