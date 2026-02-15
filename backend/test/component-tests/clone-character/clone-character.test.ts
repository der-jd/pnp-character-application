import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getCharacterResponseSchema, postCharacterCloneResponseSchema } from "api-spec";
import { INVALID_UUID, NON_EXISTENT_UUID, expectApiError } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

describe.sequential("clone-character component tests", () => {
  beforeAll(async () => {
    await setupTestContext();
  });

  afterAll(async () => {
    await cleanUpTestContext();
  });

  test("authorization header is missing", async () => {
    // Create a client without authorization header
    const unauthorizedClient = new ApiClient(getTestContext().apiBaseUrl, "");

    await expectApiError(
      () =>
        unauthorizedClient.post(`characters/${getTestContext().character.characterId}/clone`, {
          userIdOfCharacter: getTestContext().character.userId,
        }),
      401,
      "Unauthorized",
    );
  });

  test("authorization token is invalid", async () => {
    // Create a client with invalid authorization
    const malformedClient = new ApiClient(getTestContext().apiBaseUrl, "Bearer 1234567890");

    await expectApiError(
      () =>
        malformedClient.post(`characters/${getTestContext().character.characterId}/clone`, {
          userIdOfCharacter: getTestContext().character.userId,
        }),
      401,
      "Unauthorized",
    );
  });

  test("character id is not a uuid", async () => {
    await expectApiError(
      () =>
        apiClient.post(`characters/${INVALID_UUID}/clone`, {
          userIdOfCharacter: getTestContext().character.userId,
        }),
      400,
      "Invalid input values",
    );
  });

  test("no character found for non-existing character id", async () => {
    await expectApiError(
      () =>
        apiClient.post(`characters/${NON_EXISTENT_UUID}/clone`, {
          userIdOfCharacter: getTestContext().character.userId,
        }),
      404,
      "No character found",
    );
  });

  test("no character found for non-existing user id", async () => {
    await expectApiError(
      () =>
        apiClient.post(`characters/${getTestContext().character.characterId}/clone`, {
          userIdOfCharacter: NON_EXISTENT_UUID,
        }),
      404,
      "No character found",
    );
  });

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
