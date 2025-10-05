import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateCharacterUseCase } from "../lib/application/use-cases/CreateCharacterUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createErrorResult, TEST_SCENARIOS } from "./test-utils";

// Mock the CharacterService
vi.mock("../lib/services/characterService");

describe("CreateCharacterUseCase", () => {
  let useCase: CreateCharacterUseCase;
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

    useCase = new CreateCharacterUseCase(mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character data", async () => {
      const result = await useCase.execute({
        characterData: null,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      } as unknown as Parameters<typeof useCase.execute>[0]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character data is required");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        characterData: {
          generalInformation: { name: "Test Character" },
          attributes: {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Business Logic", () => {
    it("should validate character name is provided", async () => {
      const result = await useCase.execute({
        characterData: {
          generalInformation: { name: "" },
          attributes: {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Character name is required");
      }
    });

    it("should handle service errors gracefully", async () => {
      // Arrange
      vi.mocked(mockCharacterService.createCharacter).mockResolvedValue(createErrorResult("Character creation failed"));

      const input = {
        characterData: {
          generalInformation: { name: "Test Character" },
          attributes: {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to create character: Character creation failed");
      }
    });
  });
});
