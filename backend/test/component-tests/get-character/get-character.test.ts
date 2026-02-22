import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getCharacterResponseSchema } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

describe.sequential("get-character component tests", () => {
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
        const path = _case.characterId ? `characters/${_case.characterId}` : `characters/${character.characterId}`;
        const client = new ApiClient(getTestContext().apiBaseUrl, authorizationHeader);

        await expectApiError(() => client.get(path), _case.expectedStatusCode, _case.expectedErrorMessage);
      });
    });
  });

  /**
   * =============================
   * Valid requests
   * =============================
   */

  describe("Valid requests", () => {
    const validTestCases = [
      {
        name: "successfully get a character",
      },
    ];

    validTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = getTestContext().character;

        const response = getCharacterResponseSchema.parse(await apiClient.get(`characters/${character.characterId}`));

        // Verify character data matches
        expect(response).toStrictEqual(character);
      });
    });
  });
});
