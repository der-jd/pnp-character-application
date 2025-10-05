import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateBaseValueUseCase } from "../lib/application/use-cases/UpdateBaseValueUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createSuccessResult, createErrorResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("UpdateBaseValueUseCase", () => {
  let useCase: UpdateBaseValueUseCase;
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

    useCase = new UpdateBaseValueUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
        baseValueName: "healthPoints",
        newValue: 35,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character ID is required");
      }
    });

    it("should reject empty base value name", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: "",
        newValue: 35,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Base value name is required");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: "healthPoints",
        newValue: 35,
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });

    it("should reject negative values", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: "healthPoints",
        newValue: -5,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Base value cannot be negative");
      }
    });
  });

  describe("Business Logic", () => {
    it("should successfully update base value when valid input provided", async () => {
      // Arrange
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        baseValues: {
          getBaseValue: vi.fn().mockReturnValue({ current: 30, start: 30, mod: 0 }),
          healthPoints: { current: 30, start: 30, mod: 0 },
        },
      };

      const mockUpdatedCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        baseValues: {
          healthPoints: { current: 35, start: 30, mod: 5 },
        },
      };

      // Mock getCharacter and updateBaseValue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));
      vi.mocked(mockCharacterService.updateBaseValue).mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createSuccessResult(mockUpdatedCharacter as any)
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: "healthPoints",
        newValue: 35,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCharacterService.updateBaseValue).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        "healthPoints",
        { start: { initialValue: undefined, newValue: 35 } },
        TEST_SCENARIOS.VALID_ID_TOKEN
      );
    });

    it("should handle service errors gracefully", async () => {
      // Arrange - Mock getCharacter success first
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        baseValues: {
          getBaseValue: vi.fn().mockReturnValue({ current: 30, start: 30, mod: 0 }),
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));

      // Mock updateBaseValue failure
      vi.mocked(mockCharacterService.updateBaseValue).mockResolvedValue(createErrorResult("Update failed"));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: "healthPoints",
        newValue: 35,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to update base value");
      }
    });
  });
});
