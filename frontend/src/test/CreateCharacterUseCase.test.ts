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

    it("should reject character name that is too long", async () => {
      const longName = "A".repeat(51);
      const result = await useCase.execute({
        characterData: {
          generalInformation: { name: longName },
          attributes: {},
        } as any,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Character name too long");
      }
    });

    it("should reject attributes outside allowed range (too low)", async () => {
      const result = await useCase.execute({
        characterData: {
          generalInformation: { name: "Valid Name" },
          attributes: {
            courage: { current: 3 },
          },
        } as any,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Attribute courage must be between 4 and 7");
      }
    });

    it("should reject attributes outside allowed range (too high)", async () => {
      const result = await useCase.execute({
        characterData: {
          generalInformation: { name: "Valid Name" },
          attributes: {
            intelligence: { current: 8 },
          },
        } as any,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Attribute intelligence must be between 4 and 7");
      }
    });

    it("should create character successfully when data is valid", async () => {
      const createdCharacter = {
        userId: "u1",
        characterId: "new-char-1",
        characterSheet: { generalInformation: { name: "Hero", level: 1 } },
      } as any;

      vi.mocked(mockCharacterService.createCharacter).mockResolvedValue(
        // createSuccessResult is not exported here; use plain success shape
        { success: true, data: createdCharacter } as any
      );

      const result = await useCase.execute({
        characterData: {
          generalInformation: { name: "Hero" },
        } as any,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdCharacter).toBeDefined();
        expect(result.data.characterId).toBe("new-char-1");
      }
    });
  });
});
