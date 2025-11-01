import { describe, it, expect, vi, beforeEach } from "vitest";
import { LevelUpUseCase } from "../lib/application/use-cases/LevelUpUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createErrorResult, createSuccessResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("LevelUpUseCase", () => {
  let useCase: LevelUpUseCase;
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

    useCase = new LevelUpUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
        currentLevel: 1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character ID is required");
      }
    });

    it("should reject invalid current level", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 0,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Invalid current level");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 1,
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle service errors gracefully", async () => {
      // Arrange
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        level: 1,
        generalInformation: { name: "Test Character" },
      };

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue({
        success: true,
        data: mockCharacter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

      vi.mocked(mockCharacterService.levelUp).mockResolvedValue(createErrorResult("Level up failed"));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to level up character: Level up failed");
      }
    });

    it("should handle character loading errors", async () => {
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createErrorResult("Character not found"));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      const result = await useCase.execute(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to load character");
      }
    });

    it("should handle character level mismatch", async () => {
      const mockCharacter = { characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, level: 2 } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter) as any);

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      const result = await useCase.execute(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Character level mismatch");
      }
    });

    it("should handle reload failure after successful levelUp", async () => {
      // initial load
      const mockCharacter = { characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, level: 1 } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createSuccessResult(mockCharacter) as any);

      // successful levelUp response
      vi.mocked(mockCharacterService.levelUp).mockResolvedValue(
        createSuccessResult({ data: { level: { new: { value: 2 } } } }) as any
      );

      // reload fails
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createErrorResult('Reload failed') as any);

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      const result = await useCase.execute(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Level up successful but failed to reload character');
      }
    });

    it("should level up successfully and return new level and points gained", async () => {
      const mockCharacter = { characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, level: 1 } as any;
      // initial load
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createSuccessResult(mockCharacter) as any);

      // levelUp success
      vi.mocked(mockCharacterService.levelUp).mockResolvedValue(
        createSuccessResult({ data: { level: { new: { value: 2 } } } }) as any
      );

      // reload success returns updated character
      const reloadedCharacter = { characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, level: 2 } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createSuccessResult(reloadedCharacter) as any);

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      const result = await useCase.execute(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.newLevel).toBe(2);
        expect(result.data.pointsGained).toBeDefined();
        expect(result.data.pointsGained.adventurePoints).toBeGreaterThan(0);
        expect(result.data.updatedCharacter).toBeDefined();
      }
    });
  });
});
