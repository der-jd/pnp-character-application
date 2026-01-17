import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeleteHistoryEntryUseCase } from "../lib/application/use-cases/DeleteHistoryEntryUseCase";
import { HistoryService } from "../lib/services/historyService";
import { CharacterService } from "../lib/services/characterService";
import { createSuccessResult, createErrorResult, TEST_SCENARIOS } from "./test-utils";

// Mock the services
vi.mock("../lib/services/historyService");
vi.mock("../lib/services/characterService");

describe("DeleteHistoryEntryUseCase", () => {
  let useCase: DeleteHistoryEntryUseCase;
  let mockHistoryService: HistoryService;
  let mockCharacterService: CharacterService;

  beforeEach(() => {
    mockHistoryService = {
      getHistory: vi.fn(),
      deleteHistoryRecord: vi.fn(),
      addHistoryEntry: vi.fn(),
      updateHistoryComment: vi.fn(),
      revertHistoryEntry: vi.fn(),
    } as unknown as HistoryService;

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

    useCase = new DeleteHistoryEntryUseCase(mockHistoryService, mockCharacterService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
        historyEntryId: "history-123",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character ID is required");
      }
    });

    it("should reject empty history entry ID", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        historyEntryId: "",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("History entry ID is required");
      }
    });

    it("should reject empty ID token", async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        historyEntryId: "history-123",
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Business Logic", () => {
    it("should successfully delete history entry when valid input provided", async () => {
      // Arrange
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        name: "Test Character",
        level: 3,
      };

      const updatedCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        name: "Test Character",
        level: 2, // Reverted back after history deletion
      };

      // Mock getCharacter calls (initial load and reload after deletion)
      vi.mocked(mockCharacterService.getCharacter)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValueOnce(createSuccessResult(mockCharacter as any))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValueOnce(createSuccessResult(updatedCharacter as any));

      // Mock deleteHistoryRecord
      vi.mocked(mockHistoryService.deleteHistoryRecord).mockResolvedValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createSuccessResult({ success: true } as any)
      );

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        historyEntryId: "history-123",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockHistoryService.deleteHistoryRecord).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        "history-123",
        TEST_SCENARIOS.VALID_ID_TOKEN
      );
    });

    it("should handle service errors gracefully", async () => {
      // Arrange - Mock getCharacter success first
      const mockCharacter = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        name: "Test Character",
        level: 3,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockCharacter as any));

      // Mock deleteHistoryRecord failure
      vi.mocked(mockHistoryService.deleteHistoryRecord).mockResolvedValue(createErrorResult("History entry not found"));

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        historyEntryId: "history-123",
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to delete history entry");
      }
    });
  });
});
