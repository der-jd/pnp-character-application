import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloneCharacterUseCase } from "../lib/application/use-cases/CloneCharacterUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createSuccessResult, createErrorResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("CloneCharacterUseCase", () => {
  let useCase: CloneCharacterUseCase;
  let mockCharacterService: CharacterService;

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

    useCase = new CloneCharacterUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty source character ID", async () => {
      const result = await useCase.execute({
        sourceCharacterId: "",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Source character ID is required");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        sourceCharacterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Business Logic", () => {
    it("should successfully clone character when valid input provided", async () => {
      // Arrange
      const sourceCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        userId: "user-123",
        name: "Test Character",
        level: 1,
      };

      const cloneResponse = {
        characterId: "cloned-char-456",
        userId: "user-123",
      };

      const clonedCharacter = {
        characterId: "cloned-char-456",
        userId: "user-123",
        name: "Test Character (Copy)",
        level: 1,
      };

      // Mock getCharacter (source character)
      vi.mocked(mockCharacterService.getCharacter)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValueOnce(createSuccessResult(sourceCharacter as any))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValueOnce(createSuccessResult(clonedCharacter as any));

      // Mock cloneCharacter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.cloneCharacter).mockResolvedValue(createSuccessResult(cloneResponse as any));

      const input = {
        sourceCharacterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCharacterService.cloneCharacter).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        { userIdOfCharacter: "user-123" },
        TEST_SCENARIOS.VALID_ID_TOKEN
      );
    });

    it("should handle service errors gracefully", async () => {
      // Arrange - Mock getCharacter success first
      const sourceCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        userId: "user-123",
        name: "Test Character",
        level: 1,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(sourceCharacter as any));

      // Mock cloneCharacter failure
      vi.mocked(mockCharacterService.cloneCharacter).mockResolvedValue(createErrorResult("Character not found"));

      const input = {
        sourceCharacterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to clone character");
      }
    });
  });
});
