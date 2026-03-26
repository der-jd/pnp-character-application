import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CharacterSheetPage } from "@/pages/CharacterSheetPage";
import { t } from "@/i18n";
import type { Character, CombatSkills, CombatSection } from "api-spec";

// Mock the useToast hook
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the useEditableField hook
vi.mock("@/hooks/useEditableField", () => ({
  useEditableField: () => ({
    editing: null,
    editValues: { start: 0, current: 0, mod: 0 },
    setEditValues: vi.fn(),
    startEdit: vi.fn(),
    cancelEdit: vi.fn(),
  }),
}));

// Mock the API functions
vi.mock("@/api/characters", () => ({
  fetchCharacter: vi.fn(),
}));

vi.mock("@/api/character-edit", () => ({
  updateAttribute: vi.fn(),
  updateBaseValue: vi.fn(),
  updateCalculationPoints: vi.fn(),
  addSpecialAbility: vi.fn(),
}));

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useParams: () => ({ characterId: "test-character-id" }),
  useNavigate: () => vi.fn(),
}));

const createMockCharacter = (): Character => ({
  userId: "test-user",
  characterId: "test-character-id",
  rulesetVersion: "1.0.0",
  characterSheet: {
    generalInformation: {
      name: "Test Character",
      level: 1,
      levelUpProgress: { effectsByLevel: {}, effects: {} },
      sex: "male",
      profession: { name: "Warrior", skill: "combat/martialArts" },
      hobby: { name: "Reading", skill: "knowledge/history" },
      birthday: "1990-01-01",
      birthplace: "Test City",
      size: "180cm",
      weight: "80kg",
      hairColor: "Brown",
      eyeColor: "Blue",
      residence: "Test Town",
      appearance: "A test character",
      specialCharacteristics: "None",
    },
    calculationPoints: {
      adventurePoints: { start: 100, available: 50, total: 150 },
      attributePoints: { start: 80, available: 25, total: 105 },
    },
    advantages: [],
    disadvantages: [],
    specialAbilities: [],
    attributes: {
      courage: { start: 10, current: 12, mod: 2, totalCost: 4 },
      intelligence: { start: 8, current: 8, mod: 0, totalCost: 0 },
      concentration: { start: 9, current: 11, mod: 2, totalCost: 4 },
      charisma: { start: 7, current: 7, mod: 0, totalCost: 0 },
      mentalResilience: { start: 8, current: 10, mod: 2, totalCost: 4 },
      dexterity: { start: 11, current: 13, mod: 2, totalCost: 4 },
      endurance: { start: 10, current: 12, mod: 2, totalCost: 4 },
      strength: { start: 12, current: 14, mod: 2, totalCost: 4 },
    },
    skills: {
      combat: {} as CombatSkills,
      body: {} as Character["characterSheet"]["skills"]["body"],
      social: {} as Character["characterSheet"]["skills"]["social"],
      nature: {} as Character["characterSheet"]["skills"]["nature"],
      knowledge: {} as Character["characterSheet"]["skills"]["knowledge"],
      handcraft: {} as Character["characterSheet"]["skills"]["handcraft"],
    },
    combat: {} as CombatSection,
    baseValues: {
      healthPoints: { start: 20, current: 25, mod: 5 },
      mentalHealth: { start: 20, current: 20, mod: 0 },
      armorLevel: { start: 0, current: 2, mod: 2 },
      naturalArmor: { start: 0, current: 0, mod: 0 },
      initiativeBaseValue: { start: 8, current: 10, mod: 2 },
      attackBaseValue: { start: 8, current: 10, mod: 2 },
      paradeBaseValue: { start: 8, current: 10, mod: 2 },
      rangedAttackBaseValue: { start: 8, current: 10, mod: 2 },
      luckPoints: { start: 3, current: 3, mod: 0 },
      bonusActionsPerCombatRound: { start: 1, current: 1, mod: 0 },
      legendaryActions: { start: 0, current: 0, mod: 0 },
    },
  },
});

describe("CharacterSheetPage", () => {
  let queryClient: QueryClient;
  let mockCharacter: Character;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockCharacter = createMockCharacter();

    // Mock the query to return our test character
    queryClient.setQueryData(["character", "test-character-id"], mockCharacter);
  });

  it("displays attribute points in the attributes section", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CharacterSheetPage />
      </QueryClientProvider>,
    );

    // Check that attribute points are displayed
    expect(screen.getByText(t("pointsRemaining", 25))).toBeInTheDocument();
    expect(screen.getByText(t("pointsTotal", 105))).toBeInTheDocument();
  });

  it("shows attribute points when none remain", () => {
    // Create a character with 0 available attribute points
    const characterWithNoPoints = {
      ...mockCharacter,
      characterSheet: {
        ...mockCharacter.characterSheet,
        calculationPoints: {
          ...mockCharacter.characterSheet.calculationPoints,
          attributePoints: { start: 80, available: 0, total: 80 },
        },
      },
    };

    queryClient.setQueryData(["character", "test-character-id"], characterWithNoPoints);

    render(
      <QueryClientProvider client={queryClient}>
        <CharacterSheetPage />
      </QueryClientProvider>,
    );

    // When available points = 0, the text should be displayed
    expect(screen.getByText(t("pointsRemaining", 0))).toBeInTheDocument();
  });
});
