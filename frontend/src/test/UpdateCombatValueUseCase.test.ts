import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateCombatValueUseCase } from "../lib/application/use-cases/UpdateCombatValueUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createErrorResult, createSuccessResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("UpdateCombatValueUseCase", () => {
  let useCase: UpdateCombatValueUseCase;
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

    useCase = new UpdateCombatValueUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
        combatType: "melee",
        combatValueName: "swords",
        newAttackValue: 10,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character ID is required");
      }
    });

    it("should reject empty combat value name", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: "melee",
        combatValueName: "",
        newAttackValue: 10,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Combat value name is required");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: "melee",
        combatValueName: "swords",
        newAttackValue: 10,
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });

    it("should reject negative attack values", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: "melee",
        combatValueName: "swords",
        newAttackValue: -5,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Combat value cannot be negative");
      }
    });

    it("should validate combat type", async () => {
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        adventurePoints: 100,
        combatValues: {
          getCombatValue: vi.fn().mockReturnValue(null), // Invalid combat type returns null
        },
      };

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue({
        success: true,
        data: mockCharacter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: "invalid",
        combatValueName: "swords",
        newAttackValue: 10,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      } as unknown as Parameters<typeof useCase.execute>[0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Combat value 'swords' not found on character");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle service errors gracefully", async () => {
      // Arrange
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        adventurePoints: 100,
        combatValues: {
          getCombatValue: vi.fn().mockReturnValue({
            attackValue: 5,
            skilledParadeValue: 3,
          }),
        },
      };

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue({
        success: true,
        data: mockCharacter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(mockCharacterService.updateCombatStats).mockResolvedValue(createErrorResult("Combat update failed"));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: "melee" as const,
        combatValueName: "swords",
        newAttackValue: 10,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to update combat value: Combat update failed");
      }
    });

    it("should reject when character has insufficient adventure points", async () => {
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        adventurePoints: 2,
        combatValues: {
          getCombatValue: vi.fn().mockReturnValue({
            attackValue: 5,
            skilledParadeValue: 3,
          }),
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue({ success: true, data: mockCharacter } as any);

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: "melee" as const,
        combatValueName: "swords",
        newAttackValue: 10,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await useCase.execute(input as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Insufficient adventure points");
      }
    });

    it("should return error when reload after update fails", async () => {
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        adventurePoints: 100,
        combatValues: {
          getCombatValue: vi.fn().mockReturnValue({
            attackValue: 5,
            skilledParadeValue: 3,
          }),
        },
      };

      // First load succeeds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createSuccessResult(mockCharacter as any));
      // Update succeeds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.updateCombatStats).mockResolvedValue(createSuccessResult({} as any) as any);
      // Reload fails
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createErrorResult("reload fail") as any);

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: "melee" as const,
        combatValueName: "swords",
        newAttackValue: 7,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await useCase.execute(input as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Combat value updated but failed to reload character");
      }
    });

    it("should update combat value successfully", async () => {
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        adventurePoints: 100,
        combatValues: {
          getCombatValue: vi.fn().mockReturnValue({
            attackValue: 5,
            skilledParadeValue: 3,
          }),
        },
      };

      // Initial load returns current character
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createSuccessResult(mockCharacter as any));
      // Update succeeds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.updateCombatStats).mockResolvedValue(createSuccessResult({} as any) as any);
      // Reload returns updated character
      const updatedChar = { ...mockCharacter, characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, adventurePoints: 95 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createSuccessResult(updatedChar as any));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: "melee" as const,
        combatValueName: "swords",
        newAttackValue: 7,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await useCase.execute(input as any);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.updatedCharacter).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result.data.updatedCharacter as any).adventurePoints).toBe(95);
      }
    });
  });
});
