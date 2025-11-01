import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoadHistoryUseCase } from "../lib/application/use-cases/LoadHistoryUseCase";
import { HistoryService } from "../lib/services/historyService";
import { createErrorResult, createSuccessResult, TEST_SCENARIOS } from "./test-utils";

// Mock the HistoryService
vi.mock("../lib/services/historyService");

describe("LoadHistoryUseCase", () => {
  let useCase: LoadHistoryUseCase;
  let mockHistoryService: HistoryService;

  beforeEach(() => {
    mockHistoryService = {
      getHistory: vi.fn(),
    } as unknown as HistoryService;

    useCase = new LoadHistoryUseCase(mockHistoryService);
  });

  it("should validate input - missing characterId", async () => {
    const result = await useCase.execute({ characterId: "", idToken: TEST_SCENARIOS.VALID_ID_TOKEN });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe("Character ID is required");
  });

  it("should validate input - missing token", async () => {
    const result = await useCase.execute({ characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, idToken: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe("Authentication token is required");
  });

  it("should return error when history service fails", async () => {
    vi.mocked(mockHistoryService.getHistory).mockResolvedValue(createErrorResult("history failure"));

    const result = await useCase.execute({ characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, idToken: TEST_SCENARIOS.VALID_ID_TOKEN });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("Failed to load history");
  });

  it("should handle empty history response", async () => {
    vi.mocked(mockHistoryService.getHistory).mockResolvedValue(
      createSuccessResult({ items: [] } as any)
    );

    const result = await useCase.execute({ characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, idToken: TEST_SCENARIOS.VALID_ID_TOKEN });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.historyEntries).toEqual([]);
    }
  });

  it("should transform history entries and format descriptions", async () => {
    const mockHistory = {
      items: [
        {
          characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
          blockNumber: 1,
          blockId: '550e8400-e29b-41d4-a716-446655440000',
          previousBlockId: null,
          changes: [
            { id: '1', type: 6, name: 'swords', number: 1, data: { new: { value: 6 } }, learningMethod: null, calculationPoints: { adventurePoints: null, attributePoints: null }, comment: null, timestamp: '2020-01-01T00:00:00Z' },
            { id: '2', type: 5, name: 'strength', number: 2, data: { new: { value: 7 } }, learningMethod: null, calculationPoints: { adventurePoints: null, attributePoints: null }, comment: null, timestamp: '2020-01-02T00:00:00Z', isReverted: true },
            { id: '3', type: 1, name: 'Level Up', number: 3, data: { new: { level: 2 } }, learningMethod: null, calculationPoints: { adventurePoints: null, attributePoints: null }, comment: null, timestamp: '2020-01-03T00:00:00Z' },
          ],
        },
      ],
    } as any;

    vi.mocked(mockHistoryService.getHistory).mockResolvedValue(createSuccessResult(mockHistory));

    const result = await useCase.execute({ characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, idToken: TEST_SCENARIOS.VALID_ID_TOKEN });

    expect(result.success).toBe(true);
    if (result.success) {
      const entries = result.data.historyEntries;
      expect(entries.length).toBe(3);
      expect(entries[0].changeType).toBe('6'); // RecordType.SKILL_CHANGED
      expect(entries[0].changeDescription).toContain('swords');
      expect(entries[0].isReverted).toBe(false);
      expect(entries[1].changeType).toBe('5'); // RecordType.ATTRIBUTE_CHANGED
      expect(entries[1].isReverted).toBe(true);
      expect(entries[1].changeDescription).toContain('strength');
      expect(entries[2].changeType).toBe('1'); // RecordType.LEVEL_CHANGED
      expect(entries[2].changeDescription).toContain('Level Up');
    }
  });
});
