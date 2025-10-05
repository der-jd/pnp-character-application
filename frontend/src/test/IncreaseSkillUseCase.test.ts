import { describe, it, expect, vi, beforeEach } from "vitest";
import { IncreaseSkillUseCase } from "../lib/application/use-cases/IncreaseSkillUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createErrorResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("IncreaseSkillUseCase", () => {
  let useCase: IncreaseSkillUseCase;
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

    useCase = new IncreaseSkillUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
        skillName: "combat.swords",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character ID is required");
      }
    });

    it("should reject empty skill name", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        skillName: "",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Skill name is required");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        skillName: "combat.swords",
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle character loading errors gracefully", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createErrorResult("Character not found"));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        skillName: "combat.swords",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to load character");
      }
    });
  });
});
