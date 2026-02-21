import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getCharacterResponseSchema, postCharacterCloneResponseSchema } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext, deleteCharacter } from "../setup.js";
import { getTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

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

        const cloned = getCharacterResponseSchema.parse(await apiClient.get(`characters/${cloneResponse.characterId}`));
        expect(cloned.characterId).toBe(cloneResponse.characterId);
        expect(cloned.characterSheet.generalInformation.name).toBe(cloneResponse.name);

        // Verify the cloned character is identical to the original except for the character id and name
        const expectedSheet = {
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
        expect(cloned.characterSheet).toStrictEqual(expectedSheet);
      } finally {
        await deleteCharacter(cloneResponse.characterId);
      }
    });
  });
});
