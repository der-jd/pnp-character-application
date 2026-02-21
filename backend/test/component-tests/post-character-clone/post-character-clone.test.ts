import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getHistoryResponseSchema, postCharacterCloneResponseSchema, HistoryBlock } from "api-spec";
import { expectApiError, commonInvalidTestCases, verifyCharacterState } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext, deleteCharacter } from "../setup.js";
import { getTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

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
      const cloneResponse = postCharacterCloneResponseSchema.parse(
        await apiClient.post(`characters/${getTestContext().character.characterId}/clone`, {
          userIdOfCharacter: getTestContext().character.userId,
        }),
      );

      try {
        expect(cloneResponse.characterId).not.toBe(getTestContext().character.characterId);
        expect(cloneResponse.userId).toBe(getTestContext().character.userId);
        expect(cloneResponse.name).not.toBe(getTestContext().character.characterSheet.generalInformation.name);
        expect(cloneResponse.name).toContain("Copy");
        expect(cloneResponse.level).toBe(getTestContext().character.characterSheet.generalInformation.level);

        // Verify the cloned character is identical to the original except for the character id and name
        const expectedCharacter = {
          userId: getTestContext().character.userId,
          characterId: cloneResponse.characterId,
          characterSheet: {
            ...getTestContext().character.characterSheet,
            generalInformation: {
              ...getTestContext().character.characterSheet.generalInformation,
              name: cloneResponse.name,
            },
          },
        };
        await verifyCharacterState(cloneResponse.characterId, expectedCharacter);

        // Verify the character history has been copied as well
        const originalHistory = await fetchAllHistoryBlocks(getTestContext().character.characterId);
        const clonedHistory = await fetchAllHistoryBlocks(cloneResponse.characterId);

        expect(clonedHistory.length).toBe(originalHistory.length);

        // Verify each history block is identical except for characterId
        originalHistory.forEach((originalBlock: HistoryBlock, index: number) => {
          const clonedBlock = clonedHistory[index];
          expect(clonedBlock.blockNumber).toBe(originalBlock.blockNumber);
          expect(clonedBlock.blockId).toBe(originalBlock.blockId);
          expect(clonedBlock.previousBlockId).toBe(originalBlock.previousBlockId);
          expect(clonedBlock.characterId).toBe(cloneResponse.characterId); // Should point to cloned character
          expect(clonedBlock.changes).toStrictEqual(originalBlock.changes);
        });
      } finally {
        await deleteCharacter(cloneResponse.characterId);
      }
    });
  });
});
