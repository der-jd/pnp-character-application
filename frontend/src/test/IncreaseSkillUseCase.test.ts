import { describe, it, expect, vi, beforeEach } from "vitest";
import { IncreaseSkillUseCase } from "../lib/application/use-cases/IncreaseSkillUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createErrorResult, createSuccessResult, TEST_SCENARIOS } from "./test-utils";

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
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to load character");
      }
    });

    it("should handle non-existent skills", async () => {
      // Arrange
      const mockCharacter = {
        skills: {
          getSkill: vi.fn().mockReturnValue(null),
        },
        adventurePoints: 100,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue({
        success: true,
        data: mockCharacter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        skillName: "combat.nonexistent",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Skill 'combat.nonexistent' not found on character");
      }
    });

    it("should handle insufficient adventure points", async () => {
      // Arrange
      const mockCharacter = {
        skills: {
          getSkill: vi.fn().mockReturnValue({
            currentLevel: 5,
          }),
        },
        adventurePoints: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue({
        success: true,
        data: mockCharacter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

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
        expect(result.error.message).toBe("Insufficient adventure points for skill increase");
      }
    });
  });

  describe("Successful Skill Increases", () => {
    it("should successfully increase skill when all conditions are met", async () => {
      // Arrange
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        skills: {
          getSkill: vi.fn().mockImplementation((category: string, skillName: string) => {
            if (category === "combat" && skillName === "swords") {
              return { currentLevel: 5 };
            }
            return null;
          }),
        },
        adventurePoints: 50,
      } as any;

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue({
        success: true,
        data: mockCharacter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Mock a realistic backend response shape expected by the use case
      vi.mocked(mockCharacterService.updateSkill).mockResolvedValue(
        createSuccessResult({
          data: {
            changes: {
              new: { skill: { current: 6 } },
            },
            adventurePoints: {
              old: { available: 50 },
              new: { available: 49 },
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any) as any,
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        skillName: "combat.swords",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updatedCharacter).toBeDefined();
        expect(result.data.costCalculation).toBeDefined();
        expect(result.data.costCalculation.newValue).toBeGreaterThan(result.data.costCalculation.oldValue);
      }

      expect(mockCharacterService.updateSkill).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        "combat",
        "swords",
        expect.any(Object),
        TEST_SCENARIOS.VALID_ID_TOKEN,
      );
    });

    it("should handle skill names without category prefix", async () => {
      // Arrange
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        skills: {
          getSkill: vi.fn().mockImplementation((category: string, skillName: string) => {
            if (category === "combat" && skillName === "stealth") {
              return { currentLevel: 3 };
            }
            return null;
          }),
        },
        adventurePoints: 30,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue({
        success: true,
        data: mockCharacter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Mock realistic backend response for default-category skill increase
      vi.mocked(mockCharacterService.updateSkill).mockResolvedValue(
        createSuccessResult({
          data: {
            changes: {
              new: { skill: { current: 4 } },
            },
            adventurePoints: {
              old: { available: 30 },
              new: { available: 29 },
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any) as any,
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        skillName: "stealth",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updatedCharacter).toBeDefined();
        expect(result.data.costCalculation).toBeDefined();
      }
    });
  });

  describe("Service Integration", () => {
    it("should handle service update errors gracefully", async () => {
      // Arrange
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        skills: {
          getSkill: vi.fn().mockReturnValue({
            currentLevel: 5,
          }),
        },
        adventurePoints: 50,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue({
        success: true,
        data: mockCharacter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(mockCharacterService.updateSkill).mockResolvedValue(createErrorResult("Skill update failed"));

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
        expect(result.error.message).toContain("Failed to increase skill");
        expect(result.error.message).toContain("Skill update failed");
      }
    });

    it("should handle unexpected exceptions during execution", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getCharacter).mockRejectedValue(new Error("Network timeout"));

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
        expect(result.error.message).toBe("Network timeout");
      }
    });
  });
});
