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

  describe("Error Handling", () => {
    it("should handle character loading errors gracefully", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createErrorResult("Character not found"));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Test Ability",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to load character");
        expect(result.error.message).toContain("Character not found");
      }
    });

    it("should handle character reload errors after successful addition", async () => {
      // Arrange - First call succeeds, second call fails
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        specialAbilities: [],
      };

      vi.mocked(mockCharacterService.getCharacter)
        .mockResolvedValueOnce(createSuccessResult(mockCharacter as any))
        .mockResolvedValueOnce(createErrorResult("Failed to reload"));

      vi.mocked(mockCharacterService.addSpecialAbility).mockResolvedValue(
        createSuccessResult({ data: { characterId: "test-char-123" } } as any),
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Test Ability",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Special ability added but failed to reload character");
      }
    });

    it("should handle unexpected exceptions during execution", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getCharacter).mockRejectedValue(new Error("Network timeout"));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Test Ability",
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

    it("should handle non-Error exceptions", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getCharacter).mockRejectedValue("String error");

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Test Ability",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Unknown error occurred");
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
        }),
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
        TEST_SCENARIOS.VALID_ID_TOKEN,
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
        createErrorResult("Special ability not found"),
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
        expect(result.error.message).toContain("Special ability not found");
      }
    });

    it("should handle addSpecialAbility service exceptions", async () => {
      // Arrange
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 1,
        specialAbilities: [],
      };
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));

      // Mock addSpecialAbility to throw exception
      vi.mocked(mockCharacterService.addSpecialAbility).mockRejectedValue(new Error("Service unavailable"));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Test Ability",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to add special ability");
        expect(result.error.message).toContain("Service unavailable");
      }
    });

    it("should validate successful ability addition with proper service calls", async () => {
      // Arrange
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        specialAbilities: [],
      };

      const updatedCharacter = {
        ...mockCharacter,
        specialAbilities: ["Combat Reflexes"],
      };

      vi.mocked(mockCharacterService.getCharacter)
        .mockResolvedValueOnce(createSuccessResult(mockCharacter as any))
        .mockResolvedValueOnce(createSuccessResult(updatedCharacter as any));

      vi.mocked(mockCharacterService.addSpecialAbility).mockResolvedValue(
        createSuccessResult({
          data: {
            characterId: "test-char-123",
            specialAbilityName: "Combat Reflexes",
          },
        } as any),
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Combat Reflexes",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.addedAbility).toBe("Combat Reflexes");
        expect(result.data.updatedCharacter).toBeDefined();
      }

      // Verify service was called with correct parameters
      expect(mockCharacterService.addSpecialAbility).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        { specialAbility: "Combat Reflexes" },
        TEST_SCENARIOS.VALID_ID_TOKEN,
      );

      // Verify character was loaded twice (initial + reload)
      expect(mockCharacterService.getCharacter).toHaveBeenCalledTimes(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in ability names", async () => {
      // Arrange
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        specialAbilities: [],
      };

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));

      vi.mocked(mockCharacterService.addSpecialAbility).mockResolvedValue(
        createSuccessResult({ data: { characterId: "test-char-123" } } as any),
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: "Scharfschütze (Fernkampf)", // German ability name with special chars
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.addedAbility).toBe("Scharfschütze (Fernkampf)");
      }
    });

    it("should handle very long ability names", async () => {
      // Arrange
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        specialAbilities: [],
      };

      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));

      vi.mocked(mockCharacterService.addSpecialAbility).mockResolvedValue(
        createSuccessResult({ data: { characterId: "test-char-123" } } as any),
      );

      const longAbilityName = "A".repeat(100); // Very long ability name

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        specialAbilityName: longAbilityName,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.addedAbility).toBe(longAbilityName);
      }
    });
  });
});
