import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoadAllCharactersUseCase } from "../lib/application/use-cases/LoadAllCharactersUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createSuccessResult, createErrorResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("LoadAllCharactersUseCase", () => {
  let mockCharacterService: CharacterService;
  let useCase: LoadAllCharactersUseCase;

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

    useCase = new LoadAllCharactersUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Business Logic", () => {
    it("should successfully load all characters when valid input provided", async () => {
      // Arrange
      const mockCharacters = [
        {
          userId: "test-user",
          characterId: "test-char-1",
          characterSheet: { generalInformation: { name: "Character 1", level: 1 } },
        },
        {
          userId: "test-user",
          characterId: "test-char-2",
          characterSheet: { generalInformation: { name: "Character 2", level: 2 } },
        },
      ];

      vi.mocked(mockCharacterService.getAllCharacters).mockResolvedValue(createSuccessResult(mockCharacters));

      // Act
      const result = await useCase.execute({
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.characters).toEqual(mockCharacters);
        expect(result.data.characters).toHaveLength(2);
      }
      expect(mockCharacterService.getAllCharacters).toHaveBeenCalledWith(TEST_SCENARIOS.VALID_ID_TOKEN);
    });

    it("should handle empty character list", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getAllCharacters).mockResolvedValue(createSuccessResult([]));

      // Act
      const result = await useCase.execute({
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.characters).toEqual([]);
        expect(result.data.characters).toHaveLength(0);
      }
    });

    it("should handle service errors gracefully", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getAllCharacters).mockResolvedValue(
        createErrorResult("Failed to fetch characters"),
      );

      // Act
      const result = await useCase.execute({
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to load characters");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getAllCharacters).mockRejectedValue(new Error("Network error"));

      // Act
      const result = await useCase.execute({
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Network error");
      }
    });
  });
});
