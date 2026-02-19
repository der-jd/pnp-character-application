import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { getHistoryResponseSchema, HistoryBlock } from "api-spec";
import { INVALID_UUID, NON_EXISTENT_UUID, expectApiError } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

describe.sequential("get-history component tests", () => {
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
    test("authorization header is missing", async () => {
      // Create a client without authorization header
      const unauthorizedClient = new ApiClient(getTestContext().apiBaseUrl, "");

      await expectApiError(
        () => unauthorizedClient.get(`characters/${getTestContext().character.characterId}/history`),
        401,
        "Unauthorized",
      );
    });

    test("authorization header is malformed", async () => {
      // Create a client with malformed authorization
      const malformedClient = new ApiClient(getTestContext().apiBaseUrl, "dummyValue");

      await expectApiError(
        () => malformedClient.get(`characters/${getTestContext().character.characterId}/history`),
        401,
        "Unauthorized",
      );
    });

    test("authorization token is invalid", async () => {
      // Create a client with invalid authorization
      const invalidClient = new ApiClient(getTestContext().apiBaseUrl, "Bearer 1234567890");

      await expectApiError(
        () => invalidClient.get(`characters/${getTestContext().character.characterId}/history`),
        401,
        "Unauthorized",
      );
    });

    test("character id is not a uuid", async () => {
      await expectApiError(() => apiClient.get(`characters/${INVALID_UUID}/history`), 400, "Invalid input values");
    });

    test("no character found for non-existing character id", async () => {
      await expectApiError(() => apiClient.get(`characters/${NON_EXISTENT_UUID}/history`), 404, "No character found");
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
