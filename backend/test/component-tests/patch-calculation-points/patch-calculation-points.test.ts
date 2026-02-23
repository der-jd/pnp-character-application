import { describe, expect, test, beforeAll, afterAll, afterEach } from "vitest";
import {
  Character,
  HistoryRecord,
  HistoryRecordType,
  PatchCalculationPointsHistoryRecord,
  PatchCalculationPointsResponse,
  patchCalculationPointsResponseSchema,
} from "api-spec";
import { commonInvalidTestCases, expectApiError, updateAndVerifyTestContextAfterEachTest } from "../shared.js";
import { TestContext, TestContextFactory } from "../test-context-factory.js";
import { ApiClient } from "../api-client.js";

describe.sequential("patch-calculation-points component tests", () => {
  let context: TestContext;
  let currentResponse: PatchCalculationPointsResponse | undefined;

  beforeAll(async () => {
    context = await TestContextFactory.createContext();
  });

  afterAll(async () => {
    await TestContextFactory.cleanupContext(context);
  });

  afterEach(async () => {
    await updateAndVerifyTestContextAfterEachTest(
      context,
      currentResponse,
      (response: PatchCalculationPointsResponse, character: Character) => {
        if (response.data.calculationPoints.new.adventurePoints) {
          character.characterSheet.calculationPoints.adventurePoints =
            response.data.calculationPoints.new.adventurePoints;
        }
        if (response.data.calculationPoints.new.attributePoints) {
          character.characterSheet.calculationPoints.attributePoints =
            response.data.calculationPoints.new.attributePoints;
        }
      },
      (response: PatchCalculationPointsResponse, record: HistoryRecord) => {
        if (response.historyRecord) {
          Object.assign(record, response.historyRecord);
        }
      },
    );
    currentResponse = undefined;
  });

  /**
   * =============================
   * Invalid requests
   * =============================
   */

  describe("Invalid requests", () => {
    commonInvalidTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;

        const authorizationHeader = _case.authorizationHeader ?? context.authorizationHeader;
        const path = _case.characterId
          ? `characters/${_case.characterId}/skills/body/athletics`
          : `characters/${character.characterId}/skills/body/athletics`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(
          () =>
            client.patch(path, {
              current: {
                initialValue: 16,
                increasedPoints: 1,
              },
              learningMethod: "NORMAL",
            }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    test("passed initial total value doesn't match the value in the backend (adventure points)", async () => {
      const character = context.character;
      const adventurePoints = character.characterSheet.calculationPoints.adventurePoints;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/calculation-points`, {
            adventurePoints: {
              total: {
                initialValue: adventurePoints.total + 10,
                increasedPoints: 5,
              },
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial total value doesn't match the value in the backend (attribute points)", async () => {
      const character = context.character;
      const attributePoints = character.characterSheet.calculationPoints.attributePoints;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/calculation-points`, {
            attributePoints: {
              total: {
                initialValue: attributePoints.total + 10,
                increasedPoints: 5,
              },
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial start value doesn't match the value in the backend (adventure points)", async () => {
      const character = context.character;
      const adventurePoints = character.characterSheet.calculationPoints.adventurePoints;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/calculation-points`, {
            adventurePoints: {
              start: {
                initialValue: adventurePoints.start + 10,
                newValue: adventurePoints.start + 5,
              },
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial start value doesn't match the value in the backend (attribute points)", async () => {
      const character = context.character;
      const attributePoints = character.characterSheet.calculationPoints.attributePoints;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/calculation-points`, {
            attributePoints: {
              start: {
                initialValue: attributePoints.start + 10,
                newValue: attributePoints.start + 5,
              },
            },
          }),
        409,
        "doesn't match",
      );
    });
  });

  /**
   * =============================
   * Idempotent requests
   * =============================
   */

  describe("Idempotent requests", () => {
    const idempotentTestCases = [
      {
        name: "adventure points start value has already been updated to the target value (idempotency)",
        getBody: (character: Character) => ({
          adventurePoints: {
            start: {
              initialValue: character.characterSheet.calculationPoints.adventurePoints.start - 20,
              newValue: character.characterSheet.calculationPoints.adventurePoints.start,
            },
          },
        }),
      },
      {
        name: "attribute points start value has already been updated to the target value (idempotency)",
        getBody: (character: Character) => ({
          attributePoints: {
            start: {
              initialValue: character.characterSheet.calculationPoints.attributePoints.start - 5,
              newValue: character.characterSheet.calculationPoints.attributePoints.start,
            },
          },
        }),
      },
      {
        name: "total adventure points have already been updated to the target value (idempotency)",
        getBody: (character: Character) => ({
          adventurePoints: {
            total: {
              initialValue: character.characterSheet.calculationPoints.adventurePoints.total - 100,
              increasedPoints: 100,
            },
          },
        }),
      },
      {
        name: "total attribute points have already been updated to the target value (idempotency)",
        getBody: (character: Character) => ({
          attributePoints: {
            total: {
              initialValue: character.characterSheet.calculationPoints.attributePoints.total - 20,
              increasedPoints: 20,
            },
          },
        }),
      },
    ];

    idempotentTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const body = _case.getBody(character);

        const response = patchCalculationPointsResponseSchema.parse(
          await context.apiClient.patch(`characters/${character.characterId}/calculation-points`, body),
        );
        /**
         * Notice: The response is not stored in the currentResponse variable
         * because we explicitly do not want to update the local test context.
         * This is because we want to verify that the local test context is
         * still identical to the backend character after the update (idempotency).
         */

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);

        // Verify idempotency - no history record
        expect(response.historyRecord).toBeNull();

        // Verify calculation points are unchanged
        expect(response.data.calculationPoints.new).toStrictEqual(response.data.calculationPoints.old);
        if (response.data.calculationPoints.old.adventurePoints) {
          expect(response.data.calculationPoints.old.adventurePoints).toStrictEqual(
            character.characterSheet.calculationPoints.adventurePoints,
          );
        }
        if (response.data.calculationPoints.old.attributePoints) {
          expect(response.data.calculationPoints.old.attributePoints).toStrictEqual(
            character.characterSheet.calculationPoints.attributePoints,
          );
        }
      });
    });
  });

  /**
   * =============================
   * Patch calculation points
   * =============================
   */

  describe("Patch calculation points", () => {
    const updateTestCases = [
      {
        name: "update adventure points start value",
        getBody: (character: Character) => ({
          adventurePoints: {
            start: {
              initialValue: character.characterSheet.calculationPoints.adventurePoints.start,
              newValue: character.characterSheet.calculationPoints.adventurePoints.start + 50,
            },
          },
        }),
      },
      {
        name: "update attribute points start value",
        getBody: (character: Character) => ({
          attributePoints: {
            start: {
              initialValue: character.characterSheet.calculationPoints.attributePoints.start,
              newValue: character.characterSheet.calculationPoints.attributePoints.start + 10,
            },
          },
        }),
      },
      {
        name: "update total adventure points",
        getBody: (character: Character) => ({
          adventurePoints: {
            total: {
              initialValue: character.characterSheet.calculationPoints.adventurePoints.total,
              increasedPoints: 100,
            },
          },
        }),
      },
      {
        name: "update total attribute points",
        getBody: (character: Character) => ({
          attributePoints: {
            total: {
              initialValue: character.characterSheet.calculationPoints.attributePoints.total,
              increasedPoints: 10,
            },
          },
        }),
      },
      {
        name: "update all values (start and total) of adventure points and attribute points",
        getBody: (character: Character) => ({
          adventurePoints: {
            start: {
              initialValue: character.characterSheet.calculationPoints.adventurePoints.start,
              newValue: character.characterSheet.calculationPoints.adventurePoints.start + 100,
            },
            total: {
              initialValue: character.characterSheet.calculationPoints.adventurePoints.total,
              increasedPoints: 200,
            },
          },
          attributePoints: {
            start: {
              initialValue: character.characterSheet.calculationPoints.attributePoints.start,
              newValue: character.characterSheet.calculationPoints.attributePoints.start + 20,
            },
            total: {
              initialValue: character.characterSheet.calculationPoints.attributePoints.total,
              increasedPoints: 10,
            },
          },
        }),
      },
    ];

    updateTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const body = _case.getBody(character);

        const response = patchCalculationPointsResponseSchema.parse(
          await context.apiClient.patch(`characters/${character.characterId}/calculation-points`, body),
        );
        currentResponse = response;

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);

        // Verify old calculation points match character for updated points only
        if (response.data.calculationPoints.old.adventurePoints) {
          expect(response.data.calculationPoints.old.adventurePoints).toStrictEqual(
            character.characterSheet.calculationPoints.adventurePoints,
          );
        }
        if (response.data.calculationPoints.old.attributePoints) {
          expect(response.data.calculationPoints.old.attributePoints).toStrictEqual(
            character.characterSheet.calculationPoints.attributePoints,
          );
        }

        // Verify adventure points updates
        if ("adventurePoints" in body && body.adventurePoints) {
          if ("start" in body.adventurePoints && body.adventurePoints.start) {
            expect(response.data.calculationPoints.new.adventurePoints?.start).toBe(
              body.adventurePoints.start.newValue,
            );
          }

          if ("total" in body.adventurePoints && body.adventurePoints.total) {
            const expectedTotal = body.adventurePoints.total.initialValue + body.adventurePoints.total.increasedPoints;
            expect(response.data.calculationPoints.new.adventurePoints?.total).toBe(expectedTotal);

            const diffAvailable =
              response.data.calculationPoints.new.adventurePoints!.available -
              response.data.calculationPoints.old.adventurePoints!.available;
            const diffTotal =
              response.data.calculationPoints.new.adventurePoints!.total -
              response.data.calculationPoints.old.adventurePoints!.total;
            expect(diffAvailable).toBe(diffTotal);
          }
        }
        else {
          expect(response.data.calculationPoints.new.adventurePoints).toBeUndefined();
          expect(response.data.calculationPoints.old.adventurePoints).toBeUndefined();
        }

        // Verify attribute points updates
        if ("attributePoints" in body && body.attributePoints) {
          if ("start" in body.attributePoints && body.attributePoints.start) {
            expect(response.data.calculationPoints.new.attributePoints?.start).toBe(
              body.attributePoints.start.newValue,
            );
          }

          if ("total" in body.attributePoints && body.attributePoints.total) {
            const expectedTotal = body.attributePoints.total.initialValue + body.attributePoints.total.increasedPoints;
            expect(response.data.calculationPoints.new.attributePoints?.total).toBe(expectedTotal);

            const diffAvailable =
              response.data.calculationPoints.new.attributePoints!.available -
              response.data.calculationPoints.old.attributePoints!.available;
            const diffTotal =
              response.data.calculationPoints.new.attributePoints!.total -
              response.data.calculationPoints.old.attributePoints!.total;
            expect(diffAvailable).toBe(diffTotal);
          }
        }
        else {
          expect(response.data.calculationPoints.new.attributePoints).toBeUndefined();
          expect(response.data.calculationPoints.old.attributePoints).toBeUndefined();
        }

        // Verify history record was created
        expect(response.historyRecord).not.toBeNull();

        const historyRecord = response.historyRecord as PatchCalculationPointsHistoryRecord;

        // Verify basic record properties
        expect(historyRecord.name).toBeDefined();
        expect(historyRecord.number).toBeGreaterThan(0);
        expect(historyRecord.timestamp).toBeDefined();
        expect(historyRecord.type).toBe(HistoryRecordType.CALCULATION_POINTS_CHANGED);
        expect(historyRecord.id).toBeDefined();
        expect(historyRecord.learningMethod).toBeNull();

        // Verify record data matches response changes
        expect(historyRecord.data.old).toStrictEqual(response.data.calculationPoints.old);
        expect(historyRecord.data.new).toStrictEqual(response.data.calculationPoints.new);

        // Verify calculation points changes in history
        expect(historyRecord.calculationPoints).toBeDefined();
        if (historyRecord.calculationPoints?.adventurePoints) {
          expect(historyRecord.calculationPoints.adventurePoints.old).toStrictEqual(
            response.data.calculationPoints.old.adventurePoints,
          );
          expect(historyRecord.calculationPoints.adventurePoints.new).toStrictEqual(
            response.data.calculationPoints.new.adventurePoints,
          );
        }
        if (historyRecord.calculationPoints?.attributePoints) {
          expect(historyRecord.calculationPoints.attributePoints.old).toStrictEqual(
            response.data.calculationPoints.old.attributePoints,
          );
          expect(historyRecord.calculationPoints.attributePoints.new).toStrictEqual(
            response.data.calculationPoints.new.attributePoints,
          );
        }

        // Verify comment is null (not set in this operation)
        expect(historyRecord.comment).toBeNull();
      });
    });
  });
});
