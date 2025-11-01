import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateCalculationPointsUseCase } from "../lib/application/use-cases/UpdateCalculationPointsUseCase";
import { CharacterService } from "../lib/services/characterService";
import { createErrorResult, createSuccessResult, TEST_SCENARIOS, createSimpleTestCharacter } from "./test-utils";

vi.mock("../lib/services/characterService");

describe("UpdateCalculationPointsUseCase", () => {
  let useCase: UpdateCalculationPointsUseCase;
  let mockCharacterService: CharacterService;

  beforeEach(() => {
    mockCharacterService = {
      getCharacter: vi.fn(),
      updateCalculationPoints: vi.fn(),
    } as unknown as CharacterService;

    useCase = new UpdateCalculationPointsUseCase(mockCharacterService);
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

  it("should require at least one point type update", async () => {
    const result = await useCase.execute({ characterId: TEST_SCENARIOS.VALID_CHARACTER_ID, idToken: TEST_SCENARIOS.VALID_ID_TOKEN });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe("At least one point type update is required");
  });

  it("should reject negative resulting adventure points", async () => {
    const mockChar = createSimpleTestCharacter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockChar as any));

    const result = await useCase.execute({
      characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
      idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      adventurePoints: { total: { initialValue: 0, increasedPoints: -1 } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe("Adventure points cannot be negative");
  });

  it("should reject negative resulting attribute points", async () => {
    const mockChar = createSimpleTestCharacter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockChar as any));

    const result = await useCase.execute({
      characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
      idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      attributePoints: { total: { initialValue: 0, increasedPoints: -5 } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe("Attribute points cannot be negative");
  });

  it("should return error when character load fails", async () => {
    vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createErrorResult("not found"));

    const result = await useCase.execute({
      characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
      idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      adventurePoints: { total: { initialValue: 1, increasedPoints: 1 } },
    } as any);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("Failed to load character");
  });

  it("should handle service update failure", async () => {
    const mockChar = createSimpleTestCharacter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockChar as any));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.updateCalculationPoints).mockResolvedValue(createErrorResult("update failed") as any);

    const result = await useCase.execute({
      characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
      idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      adventurePoints: { total: { initialValue: 1, increasedPoints: 1 } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("Failed to update calculation points");
  });

  it("should handle reload failure after successful update", async () => {
    const mockChar = createSimpleTestCharacter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createSuccessResult(mockChar as any));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.updateCalculationPoints).mockResolvedValue(createSuccessResult({} as any) as any);
    // Second call to getCharacter fails
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValueOnce(createErrorResult("reload fail") as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await useCase.execute({
      characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
      idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      adventurePoints: { total: { initialValue: 1, increasedPoints: 1 } },
    } as any);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toBe("Points updated but failed to reload character");
  });

  it("should update points successfully", async () => {
    const mockChar = createSimpleTestCharacter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult(mockChar as any));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.updateCalculationPoints).mockResolvedValue(createSuccessResult({} as any) as any);

    // After update, reload returns updated char
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(mockCharacterService.getCharacter).mockResolvedValue(createSuccessResult({ ...mockChar, characterId: TEST_SCENARIOS.VALID_CHARACTER_ID } as any));

    const result = await useCase.execute({
      characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
      idToken: TEST_SCENARIOS.VALID_ID_TOKEN,
      adventurePoints: { total: { initialValue: 5, increasedPoints: 3 } },
      attributePoints: { total: { initialValue: 2, increasedPoints: 1 } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pointsChanged.adventurePoints).toBe(3);
      expect(result.data.pointsChanged.attributePoints).toBe(1);
      expect(result.data.updatedCharacter).toBeDefined();
    }
  });
});
