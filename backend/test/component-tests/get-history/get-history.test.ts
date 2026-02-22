import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { getHistoryResponseSchema, HistoryBlock } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

describe.sequential("get-history component tests", () => {
  let apiClient: ApiClient;

  beforeAll(async () => {
    await setupTestContext();
    apiClient = getTestContext().apiClient;
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

        const authorizationHeader = _case.authorizationHeader ?? getTestContext().authorizationHeader;
        const path = _case.characterId
          ? `characters/${_case.characterId}/history`
          : `characters/${character.characterId}/history`;
        const client = new ApiClient(getTestContext().apiBaseUrl, authorizationHeader);

        await expectApiError(() => client.get(path), _case.expectedStatusCode, _case.expectedErrorMessage);
      });
    });

    test("invalid block number query - non-numeric", async () => {
      await expectApiError(
        () => apiClient.get(`characters/${getTestContext().character.characterId}/history`, { "block-number": "abc" }),
        400,
        "Invalid input values",
      );
    });

    test("invalid block number query - negative", async () => {
      await expectApiError(
        () => apiClient.get(`characters/${getTestContext().character.characterId}/history`, { "block-number": "-1" }),
        400,
        "Invalid input values",
      );
    });

    test("invalid block number query - zero", async () => {
      await expectApiError(
        () => apiClient.get(`characters/${getTestContext().character.characterId}/history`, { "block-number": "0" }),
        400,
        "Invalid input values",
      );
    });

    test("invalid block number query - too large", async () => {
      await expectApiError(
        () =>
          apiClient.get(`characters/${getTestContext().character.characterId}/history`, { "block-number": "100001" }),
        400,
        "Invalid input values",
      );
    });
  });

  /**
   * =============================
   * Valid requests
   * =============================
   */

  describe("Valid requests", () => {
    test("successfully get latest history", async () => {
      const response = getHistoryResponseSchema.parse(
        await apiClient.get(`characters/${getTestContext().character.characterId}/history`),
      );

      expect(response.items.length).toBeGreaterThan(0);

      // Check that all history items have the same character id as the input
      response.items.forEach((historyBlock: HistoryBlock) => {
        expect(historyBlock.characterId).toBe(getTestContext().character.characterId);
      });

      // Initial history block has no previous block
      if (response.items[response.items.length - 1].blockNumber === 1) {
        expect(response.previousBlockNumber).toBeNull();
        expect(response.previousBlockId).toBeNull();
      }
      // Check that the previous block number is equal to the block number of the last item minus 1
      else {
        expect(response.previousBlockNumber).toBe(response.items[response.items.length - 1].blockNumber - 1);
      }
    });

    test("successfully get specific history block", async () => {
      const latest = getHistoryResponseSchema.parse(
        await apiClient.get(`characters/${getTestContext().character.characterId}/history`),
      );
      const blockNumber = latest.items[0].blockNumber;

      const response = getHistoryResponseSchema.parse(
        await apiClient.get(`characters/${getTestContext().character.characterId}/history`, {
          "block-number": blockNumber,
        }),
      );

      expect(response.items.length).toBe(1);
      expect(response.items[0].blockNumber).toBe(blockNumber);
      expect(response.items[0].characterId).toBe(getTestContext().character.characterId);
    });
  });
});
