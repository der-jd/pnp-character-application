import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  getHistoryResponseSchema,
  postCharacterCloneResponseSchema,
  HistoryBlock,
  PostCharacterCloneResponse,
  Character,
  HistoryRecord,
} from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext, deleteCharacter } from "../setup.js";
import { getTestContext, setTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";
import { updateAndVerifyTestContextAfterEachTest } from "../shared.js";

async function fetchAllHistoryBlocks(characterId: string): Promise<HistoryBlock[]> {
  const allBlocks: HistoryBlock[] = [];
  let currentBlockNumber: number | null = null;

  do {
    const response = getHistoryResponseSchema.parse(
      await apiClient.get(
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

describe.sequential("post-character-clone component tests", () => {
  let currentResponse: PostCharacterCloneResponse | undefined;

  beforeAll(async () => {
    await setupTestContext();
  });

  afterAll(async () => {
    await cleanUpTestContext();
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
    const _characterFromTestSuite = getTestContext().character;

    await updateAndVerifyTestContextAfterEachTest(
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
      await deleteCharacter(currentResponse.characterId);
    }

    currentResponse = undefined;

    // Enable cleanup of the character from this test suite in the afterAll hook
    setTestContext({
      character: _characterFromTestSuite,
    });
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
          ? `characters/${_case.characterId}/clone`
          : `characters/${character.characterId}/clone`;
        const client = new ApiClient(getTestContext().apiBaseUrl, authorizationHeader);

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
        await apiClient.post(`characters/${getTestContext().character.characterId}/clone`, {
          userIdOfCharacter: getTestContext().character.userId,
        }),
      );
      currentResponse = response;

      expect(response.characterId).not.toBe(getTestContext().character.characterId);
      expect(response.userId).toBe(getTestContext().character.userId);
      expect(response.name).not.toBe(getTestContext().character.characterSheet.generalInformation.name);
      expect(response.name).toContain("Copy");
      expect(response.level).toBe(getTestContext().character.characterSheet.generalInformation.level);

      // Verify the character history has been copied as well
      const originalHistory = await fetchAllHistoryBlocks(getTestContext().character.characterId);
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
