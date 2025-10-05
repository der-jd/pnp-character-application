import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddSpecialAbilityUseCase } from "../lib/application/use-cases/AddSpecialAbilityUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createSuccessResult, createErrorResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("AddSpecialAbilityUseCase", () => {
  let mockCharacterService: CharacterService;
  let useCase: AddSpecialAbilityUseCase;

  beforeEach(() => {
    mockCharacterService = {
      getCharacter: vi.fn(),
      getAllCharacters: vi.fn(),
      updateSkill: vi.fn(),
      updateAttribute: vi.fn(),
      updateBaseValue: vi.fn(),
      updateCombatStats: vi.fn(),
      levelUp: vi.fn(),
      createCharacter: vi.fn(),
      cloneCharacter: vi.fn(),
      addSpecialAbility: vi.fn(),
      updateCalculationPoints: vi.fn(),
      deleteCharacter: vi.fn(),
    } as unknown as CharacterService;

    useCase = new AddSpecialAbilityUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
        specialAbilityName: "Special Ability",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character ID is required");
      }
    });

    it("should reject empty special ability name", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Special ability name is required");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Special Ability",
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Business Logic", () => {
    it("should successfully add special ability when valid input provided", async () => {
      // Arrange - Mock getCharacter calls (initial load and reload)
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        specialAbilities: [],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));

      // Mock addSpecialAbility success
      vi.mocked(mockCharacterService.addSpecialAbility).mockResolvedValue(
        createSuccessResult({
          data: {
            characterId: "test-character-123",
            userId: "test-user-456",
            specialAbilityName: "Special Ability",
            specialAbilities: {
              old: { values: [] },
              new: { values: ["Special Ability"] },
            },
          },
          historyRecord: null,
        })
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Special Ability",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCharacterService.addSpecialAbility).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        { specialAbility: "Special Ability" },
        TEST_SCENARIOS.VALID_ID_TOKEN
      );
    });

    it("should handle service errors gracefully", async () => {
      // Arrange - Mock getCharacter success first
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 1,
        specialAbilities: [],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));

      // Mock addSpecialAbility failure
      vi.mocked(mockCharacterService.addSpecialAbility).mockResolvedValue(
        createErrorResult("Special ability not found")
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Special Ability",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to add special ability");
      }
    });
  });
});
