import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateAttributeUseCase } from "../lib/application/use-cases/UpdateAttributeUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createSuccessResult, createErrorResult, TEST_SCENARIOS } from "./test-utils";

describe("UpdateAttributeUseCase", () => {
  let mockCharacterService: CharacterService;
  let useCase: UpdateAttributeUseCase;

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

    useCase = new UpdateAttributeUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
        attributeName: "strength",
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character ID is required");
      }
    });

    it("should reject empty attribute name", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: "",
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Attribute name is required");
      }
    });

    it("should reject invalid attribute values", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: "strength",
        newValue: -1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Attribute value cannot be negative");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: "strength",
        newValue: 12,
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Business Logic", () => {
    it("should successfully update attribute when valid input provided", async () => {
      // Arrange
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        attributes: {
          getAttribute: vi.fn().mockReturnValue({
            currentValue: 10,
            name: "strength",
          }),
        },
        attributePoints: 20,
      };

      const mockUpdatedCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        attributes: { strength: { current: 12 } },
      };

      // Mock getCharacter and updateAttribute
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));
      vi.mocked(mockCharacterService.updateAttribute).mockResolvedValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSuccessResult(mockUpdatedCharacter as any)
      );

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: "strength",
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockCharacterService.updateAttribute).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        "strength",
        { current: { increasedPoints: 2, initialValue: 10 } },
        TEST_SCENARIOS.VALID_ID_TOKEN
      );
    });

    it("should handle character loading failure", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createErrorResult("Character not found"));

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.INVALID_CHARACTER_ID,
        attributeName: "strength",
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to load character");
      }
    });

    it("should handle attribute update failure", async () => {
      // Arrange
      const mockCharacter = {
        characterId: "test-char-123",
        name: "Test Character",
        level: 3,
        attributes: {
          getAttribute: vi.fn().mockReturnValue({
            currentValue: 10,
            name: "strength",
          }),
        },
        attributePoints: 20,
      };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));
      vi.mocked(mockCharacterService.updateAttribute).mockResolvedValue(
        createErrorResult("Insufficient attribute points")
      );

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: "strength",
        newValue: 18,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to update attribute");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors gracefully", async () => {
      // Arrange
      vi.mocked(mockCharacterService.getCharacter).mockRejectedValue(new Error("Network timeout"));

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: "strength",
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Network timeout");
      }
    });
  });
});
