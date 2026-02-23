import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  getHistoryResponseSchema,
  postCharacterCloneResponseSchema,
  HistoryBlock,
  PostCharacterCloneResponse,
  Character,
} from "api-spec";
import { expectApiError, commonInvalidTestCases, updateAndVerifyTestContextAfterEachTest } from "../shared.js";
import { ApiClient } from "../api-client.js";
import { TestContext, TestContextFactory } from "../test-context-factory.js";

describe.sequential("post-character-clone component tests", () => {
  let context: TestContext;
  let currentResponse: PostCharacterCloneResponse | undefined;

  async function fetchAllHistoryBlocks(characterId: string): Promise<HistoryBlock[]> {
    const allBlocks: HistoryBlock[] = [];
    let currentBlockNumber: number | null = null;

    do {
      const response = getHistoryResponseSchema.parse(
        await context.apiClient.get(
          `characters/${characterId}/history`,
          currentBlockNumber ? { "block-number": currentBlockNumber } : undefined,
        ),
      );

      // Add blocks in reverse order (latest first)
      allBlocks.push(...response.items);

      // Set the next block number to fetch
      currentBlockNumber = response.previousBlockNumber;
    } while (currentBlockNumber !== null);

    return allBlocks;
  }

  beforeAll(async () => {
    context = await TestContextFactory.createContext();
  });

  afterAll(async () => {
    await TestContextFactory.cleanupContext(context);
  });

  /**
   * In this test suite we create two cloned characters:
   * - one for the test suite itself (default test setup)
   * - one for the clone test
   * After each test we explicitly delete the cloned character
   * from the test case and reset the context to the original character
   * from this test suite so that it is cleaned up in the afterAll hook.
   */
  afterEach(async () => {
    const _characterFromTestSuite = context.character;

    await updateAndVerifyTestContextAfterEachTest(
      context,
      currentResponse,
      (response: PostCharacterCloneResponse, character: Character) => {
        character.characterId = response.characterId;
        character.characterSheet.generalInformation.name = response.name;
      },
      () => {
        // No history record update necessary
      },
    );

    // Delete the cloned character from the test case
    if (currentResponse) {
      await TestContextFactory.deleteCharacter(context.apiClient, currentResponse.characterId);
      console.log(`Deleted cloned character ${currentResponse.characterId} from test case.`);
    }

    currentResponse = undefined;

    // Enable cleanup of the character from this test suite in the afterAll hook
    context.character = _characterFromTestSuite;
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
          ? `characters/${_case.characterId}/clone`
          : `characters/${character.characterId}/clone`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(
          () =>
            client.post(path, {
              userIdOfCharacter: character.userId,
            }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });
  });

  /**
   * =============================
   * Valid requests
   * =============================
   */

  describe("Valid requests", () => {
    test("successfully clone an own character", async () => {
      const response = postCharacterCloneResponseSchema.parse(
        await context.apiClient.post(`characters/${context.character.characterId}/clone`, {
          userIdOfCharacter: context.character.userId,
        }),
      );
      currentResponse = response;
      console.log(`Cloned character ${context.character.characterId} to ${response.characterId} for test case.`);

      expect(response.characterId).not.toBe(context.character.characterId);
      expect(response.userId).toBe(context.character.userId);
      expect(response.name).not.toBe(context.character.characterSheet.generalInformation.name);
      expect(response.name).toContain("Copy");
      expect(response.level).toBe(context.character.characterSheet.generalInformation.level);

      // Verify the character history has been copied as well
      const originalHistory = await fetchAllHistoryBlocks(context.character.characterId);
      const clonedHistory = await fetchAllHistoryBlocks(response.characterId);

      expect(clonedHistory.length).toBe(originalHistory.length);

      // Verify each history block is identical except for characterId
      originalHistory.forEach((originalBlock: HistoryBlock, index: number) => {
        const clonedBlock = clonedHistory[index];
        expect(clonedBlock.blockNumber).toBe(originalBlock.blockNumber);
        expect(clonedBlock.blockId).toBe(originalBlock.blockId);
        expect(clonedBlock.previousBlockId).toBe(originalBlock.previousBlockId);
        expect(clonedBlock.characterId).toBe(response.characterId); // Should point to cloned character
        expect(clonedBlock.changes).toStrictEqual(originalBlock.changes);
      });
    });
  });
});
