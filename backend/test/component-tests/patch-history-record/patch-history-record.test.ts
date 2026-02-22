import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  MAX_STRING_LENGTH_VERY_LONG,
  patchHistoryRecordResponseSchema,
  PatchHistoryRecordResponse,
  HistoryRecord,
} from "api-spec";
import { expectApiError, commonInvalidTestCases, updateAndVerifyTestContextAfterEachTest } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";
import { INVALID_UUID } from "../shared.js";

describe.sequential("patch-history-record component tests", () => {
  let currentResponse: PatchHistoryRecordResponse | undefined;

  beforeAll(async () => {
    await setupTestContext();
  });

  afterAll(async () => {
    await cleanUpTestContext();
  });

  afterEach(async () => {
    await updateAndVerifyTestContextAfterEachTest(
      currentResponse,
      () => {
        // No character update necessary
      },
      (response: PatchHistoryRecordResponse, record: HistoryRecord) => {
        record.comment = response.comment;
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
        const character = getTestContext().character;
        const latestRecord = getTestContext().lastHistoryRecord;

        const authorizationHeader = _case.authorizationHeader ?? getTestContext().authorizationHeader;
        const path = _case.characterId
          ? `characters/${_case.characterId}/history/${latestRecord.id}`
          : `characters/${character.characterId}/history/${latestRecord.id}`;
        const client = new ApiClient(getTestContext().apiBaseUrl, authorizationHeader);

        await expectApiError(
          () =>
            client.patch(path, {
              comment: "comment",
            }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    test("record id is not a uuid", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/history/${INVALID_UUID}`, {
            comment: "comment",
          }),
        400,
        "Invalid input values",
      );
    });

    test("record id not found", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/history/190b1c74-9dd9-4dee-b739-4c58dade9da8`, {
            comment: "comment",
          }),
        404,
        "not found",
      );
    });

    test("history comment exceeds maximum length", async () => {
      const character = getTestContext().character;
      const latestRecord = getTestContext().lastHistoryRecord;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/history/${latestRecord.id}`, {
            comment: "x".repeat(MAX_STRING_LENGTH_VERY_LONG + 1),
          }),
        400,
        "Invalid input values",
      );
    });
  });

  /**
   * =============================
   * Idempotency tests
   * =============================
   */

  describe("Idempotency", () => {
    test("same patch request multiple times produces identical result", async () => {
      const character = getTestContext().character;
      const latestRecord = getTestContext().lastHistoryRecord;
      const latestBlockNumber = getTestContext().latestHistoryBlockNumber;

      const patchRequest = {
        comment: latestRecord.comment,
      };

      const response = patchHistoryRecordResponseSchema.parse(
        await apiClient.patch(`characters/${character.characterId}/history/${latestRecord.id}`, patchRequest),
      );
      /**
       * Notice: The response is not stored in the currentResponse variable
       * because we explicitly do not want to update the local test context.
       * This is because we want to verify that the local test context is
       * still identical to the backend character after the update (idempotency).
       */

      expect(response.characterId).toBe(character.characterId);
      expect(response.blockNumber).toBe(latestBlockNumber);
      expect(response.recordId).toBe(latestRecord.id);
      expect(response.comment).toBe(patchRequest.comment);
    });
  });

  /**
   * =============================
   * Patch history record
   * =============================
   */

  describe("Patch history record", () => {
    const testCases = [
      {
        name: "set comment for latest history block",
        queryParams: undefined,
      },
      {
        name: "set comment with explicit block number",
        queryParams: {
          "block-number": "latest", // Will be replaced in test because the test context is not initialized yet
        },
      },
    ];

    testCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = getTestContext().character;
        const latestRecord = getTestContext().lastHistoryRecord;
        const latestBlockNumber = getTestContext().latestHistoryBlockNumber;

        // Replace "latest" with actual block number if needed
        const queryParams =
          _case.queryParams?.["block-number"] === "latest"
            ? { "block-number": `${latestBlockNumber}` }
            : _case.queryParams;
        const _comment = `This is a component test comment - ${new Date().toISOString()}`;

        const response = patchHistoryRecordResponseSchema.parse(
          await apiClient.patch(
            `characters/${character.characterId}/history/${latestRecord.id}`,
            {
              comment: _comment,
            },
            queryParams,
          ),
        );
        currentResponse = response;

        // Verify response structure
        expect(response.characterId).toBe(character.characterId);
        expect(response.blockNumber).toBe(latestBlockNumber);
        expect(response.recordId).toBe(latestRecord.id);
        expect(response.comment).toBe(_comment);
      });
    });
  });
});
