import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoadCharacterUseCase } from "../lib/application/use-cases/LoadCharacterUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createSuccessResult, createErrorResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("LoadCharacterUseCase", () => {
  let mockCharacterService: CharacterService;
  let useCase: LoadCharacterUseCase;

  beforeEach(() => {
    // Create a properly mocked CharacterService
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

    useCase = new LoadCharacterUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character ID is required");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Business Logic", () => {
    it("should successfully load character when valid input provided", async () => {
      // Arrange
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        attributes: {
          courage: { current: 12, start: 10, mod: 2 },
        },
      };

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter));

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.character).toEqual(mockCharacter);
      }
      expect(mockCharacterService.getCharacter).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        TEST_SCENARIOS.VALID_ID_TOKEN
      );
    });

    it("should handle service errors gracefully", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createErrorResult("Character not found"));

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.INVALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to load character");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getCharacter).mockRejectedValue(new Error("Network error"));

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
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
