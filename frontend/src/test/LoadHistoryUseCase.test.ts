import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoadHistoryUseCase } from "../lib/application/use-cases/LoadHistoryUseCase";
import { HistoryService } from "../lib/services/historyService";
import { createSuccessResult, createErrorResult, TEST_SCENARIOS } from "./test-utils";

describe("LoadHistoryUseCase", () => {
  let mockHistoryService: HistoryService;
  let useCase: LoadHistoryUseCase;

  beforeEach(() => {
    mockHistoryService = {
      getHistory: vi.fn(),
      deleteHistoryRecord: vi.fn(),
      addHistoryEntry: vi.fn(),
      updateHistoryComment: vi.fn(),
      revertHistoryEntry: vi.fn(),
    } as unknown as HistoryService;
    useCase = new LoadHistoryUseCase(mockHistoryService);
  });

  describe("Input Validation", () => {
    it("should reject empty character ID", async () => {
      const result = await useCase.execute({
        characterId: "",
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
        idToken: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Authentication token is required");
      }
    });
  });

  describe("Business Logic", () => {
    it("should successfully load history when valid input provided", async () => {
      // Arrange
      const mockHistory = [
        {
          entryId: "entry-1",
          timestamp: "2025-01-01T10:00:00Z",
          action: "skill_increase",
          description: "Increased Swords from 8 to 9",
        },
        {
          entryId: "entry-2",
          timestamp: "2025-01-01T11:00:00Z",
          action: "attribute_increase",
          description: "Increased Strength from 10 to 11",
        },
      ];

      mockHistoryService.getHistory.mockResolvedValue(createSuccessResult(mockHistory));

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.historyEntries).toEqual(mockHistory);
        expect(result.data.historyEntries).toHaveLength(2);
      }
      expect(mockHistoryService.getHistory).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        TEST_SCENARIOS.VALID_ID_TOKEN
      );
    });

    it("should handle empty history", async () => {
      // Arrange
      mockHistoryService.getHistory.mockResolvedValue(createSuccessResult([]));

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.historyEntries).toEqual([]);
        expect(result.data.historyEntries).toHaveLength(0);
      }
    });

    it("should handle service errors gracefully", async () => {
      // Arrange
      mockHistoryService.getHistory.mockResolvedValue(createErrorResult("History not found"));

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.INVALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Failed to load history");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors", async () => {
      // Arrange
      mockHistoryService.getHistory.mockRejectedValue(new Error("Database timeout"));

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Database timeout");
      }
    });
  });
});
