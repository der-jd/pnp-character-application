import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateCalculationPointsUseCase } from "../lib/application/use-cases/UpdateCalculationPointsUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createSuccessResult, createErrorResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("UpdateCalculationPointsUseCase", () => {
  let useCase: UpdateCalculationPointsUseCase;
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

    useCase = new UpdateCalculationPointsUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
        adventurePoints: {
          start: { initialValue: 100, newValue: 110 },
        },
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
        adventurePoints: {
          start: { initialValue: 100, newValue: 110 },
        },
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });

    it("should require at least one update field", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("At least one calculation point update");
      }
    });
  });

  describe("Business Logic", () => {
    it("should handle adventure points updates", async () => {
      // Arrange
      vi.mocked(mockCharacterService.updateCalculationPoints).mockResolvedValue(createSuccessResult({ success: true }));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        adventurePoints: {
          start: { initialValue: 100, newValue: 110 },
        },
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCharacterService.updateCalculationPoints).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        expect.objectContaining({
          adventurePoints: {
            start: { initialValue: 100, newValue: 110 },
          },
        }),
        TEST_SCENARIOS.VALID_ID_TOKEN
      );
    });

    it("should handle attribute points updates", async () => {
      // Arrange
      vi.mocked(mockCharacterService.updateCalculationPoints).mockResolvedValue(createSuccessResult({ success: true }));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributePoints: {
          start: { initialValue: 50, newValue: 60 },
        },
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle service errors gracefully", async () => {
      // Arrange
      vi.mocked(mockCharacterService.updateCalculationPoints).mockResolvedValue(
        createErrorResult("Calculation points update failed")
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        adventurePoints: {
          start: { initialValue: 100, newValue: 110 },
        },
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Calculation points update failed");
      }
    });
  });
});
