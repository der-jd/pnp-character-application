import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { MAX_STRING_LENGTH_VERY_LONG, patchHistoryRecordResponseSchema } from "api-spec";
import { expectApiError, verifyLatestHistoryRecord, commonInvalidTestCases } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext, setTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";
import { INVALID_UUID } from "../shared.js";

describe("patch-history-record component tests", () => {
  beforeAll(async () => {
    await setupTestContext();
  });

  afterAll(async () => {
    await cleanUpTestContext();
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

        const response = patchHistoryRecordResponseSchema.parse(
          await apiClient.patch(
            `characters/${character.characterId}/history/${latestRecord.id}`,
            {
              comment: "This is a test comment",
            },
            queryParams,
          ),
        );

        // Verify response structure
        expect(response.characterId).toBe(character.characterId);
        expect(response.blockNumber).toBe(latestBlockNumber);
        expect(response.recordId).toBe(latestRecord.id);
        expect(response.comment).toBe("This is a test comment");

        // Update test context - set the updated comment
        setTestContext({
          lastHistoryRecord: { ...getTestContext().lastHistoryRecord, comment: response.comment },
        });

        await verifyLatestHistoryRecord(character.characterId, getTestContext().lastHistoryRecord);
      });
    });
  });
});
