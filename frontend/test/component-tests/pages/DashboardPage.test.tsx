import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardPage } from "@/pages/DashboardPage";
import { createWrapper } from "../../helpers";

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the characters API
vi.mock("@/api/characters", () => ({
  fetchCharacters: vi.fn(),
  deleteCharacter: vi.fn(),
  cloneCharacter: vi.fn(),
}));

import * as charactersApi from "@/api/characters";

const mockCharacters = [
  { characterId: "char-1", name: "Gandalf", level: 5, userId: "user-1", rulesetVersion: "1.0" },
  { characterId: "char-2", name: "Aragorn", level: 3, userId: "user-1", rulesetVersion: "1.0" },
];

describe("DashboardPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    vi.mocked(charactersApi.fetchCharacters).mockReset();
    vi.mocked(charactersApi.deleteCharacter).mockReset();
    vi.mocked(charactersApi.cloneCharacter).mockReset();
  });

  it("shows loading spinner initially", () => {
    vi.mocked(charactersApi.fetchCharacters).mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />, { wrapper: createWrapper() });
    // FullPageSpinner renders a spinner element
    expect(document.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("shows empty state when no characters exist", async () => {
    vi.mocked(charactersApi.fetchCharacters).mockResolvedValue({ characters: [] });
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Du hast noch keine Charaktere.")).toBeInTheDocument();
      expect(screen.getByText("Erstelle deinen ersten Charakter, um loszulegen!")).toBeInTheDocument();
    });
  });

  it("renders character list with names and levels", async () => {
    vi.mocked(charactersApi.fetchCharacters).mockResolvedValue({ characters: mockCharacters });
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Gandalf")).toBeInTheDocument();
      expect(screen.getByText("Aragorn")).toBeInTheDocument();
    });

    // Check level badges
    expect(screen.getByText(/Stufe 5/)).toBeInTheDocument();
    expect(screen.getByText(/Stufe 3/)).toBeInTheDocument();
  });

  it("displays the dashboard title", async () => {
    vi.mocked(charactersApi.fetchCharacters).mockResolvedValue({ characters: mockCharacters });
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Meine Charaktere")).toBeInTheDocument();
    });
  });

  it("has a create character button", async () => {
    vi.mocked(charactersApi.fetchCharacters).mockResolvedValue({ characters: [] });
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Neuen Charakter erstellen")).toBeInTheDocument();
    });
  });

  it("navigates to character creation when button is clicked", async () => {
    vi.mocked(charactersApi.fetchCharacters).mockResolvedValue({ characters: [] });
    const user = userEvent.setup();
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Neuen Charakter erstellen")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Neuen Charakter erstellen"));
    expect(mockNavigate).toHaveBeenCalledWith("/characters/new");
  });

  it("shows error state on fetch failure", async () => {
    vi.mocked(charactersApi.fetchCharacters).mockRejectedValue(new Error("Fetch failed"));
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Fehler beim Laden der Daten.")).toBeInTheDocument();
    });
  });

  it("navigates to character sheet when open button is clicked", async () => {
    vi.mocked(charactersApi.fetchCharacters).mockResolvedValue({ characters: mockCharacters });
    const user = userEvent.setup();
    render(<DashboardPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Gandalf")).toBeInTheDocument();
    });

    // Click the chevron right (open) button for Gandalf
    const openButtons = screen.getAllByTitle("Charakter öffnen");
    await user.click(openButtons[0]!);
    expect(mockNavigate).toHaveBeenCalledWith("/characters/char-1");
  });
});
