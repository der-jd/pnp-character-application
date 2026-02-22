import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { getHistoryResponseSchema, HistoryBlock } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { ApiClient } from "../api-client.js";
import { TestContext, TestContextFactory } from "../test-context-factory.js";

describe.sequential("get-history component tests", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await TestContextFactory.createContext();
  });

  afterAll(async () => {
    await TestContextFactory.cleanupContext(context);
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
          ? `characters/${_case.characterId}/history`
          : `characters/${character.characterId}/history`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(() => client.get(path), _case.expectedStatusCode, _case.expectedErrorMessage);
      });
    });

    test("invalid block number query - non-numeric", async () => {
      await expectApiError(
        () => context.apiClient.get(`characters/${context.character.characterId}/history`, { "block-number": "abc" }),
        400,
        "Invalid input values",
      );
    });

    test("invalid block number query - negative", async () => {
      await expectApiError(
        () => context.apiClient.get(`characters/${context.character.characterId}/history`, { "block-number": "-1" }),
        400,
        "Invalid input values",
      );
    });

    test("invalid block number query - zero", async () => {
      await expectApiError(
        () => context.apiClient.get(`characters/${context.character.characterId}/history`, { "block-number": "0" }),
        400,
        "Invalid input values",
      );
    });

    test("invalid block number query - too large", async () => {
      await expectApiError(
        () =>
          context.apiClient.get(`characters/${context.character.characterId}/history`, { "block-number": "100001" }),
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
        await context.apiClient.get(`characters/${context.character.characterId}/history`),
      );

      expect(response.items.length).toBeGreaterThan(0);

      // Check that all history items have the same character id as the input
      response.items.forEach((historyBlock: HistoryBlock) => {
        expect(historyBlock.characterId).toBe(context.character.characterId);
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
        await context.apiClient.get(`characters/${context.character.characterId}/history`),
      );
      const blockNumber = latest.items[0].blockNumber;

      const response = getHistoryResponseSchema.parse(
        await context.apiClient.get(`characters/${context.character.characterId}/history`, {
          "block-number": blockNumber,
        }),
      );

      expect(response.items.length).toBe(1);
      expect(response.items[0].blockNumber).toBe(blockNumber);
      expect(response.items[0].characterId).toBe(context.character.characterId);
    });
  });
});
