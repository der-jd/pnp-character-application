import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getCharacterResponseSchema } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { ApiClient } from "../api-client.js";
import { TestContext, TestContextFactory } from "../test-context-factory.js";

describe.sequential("get-character component tests", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await TestContextFactory.createContext();
  });

  afterAll(async () => {
    if (context) {
      await TestContextFactory.cleanupContext(context);
    }
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
        const path = _case.characterId ? `characters/${_case.characterId}` : `characters/${character.characterId}`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

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
        const character = context.character;

        const response = getCharacterResponseSchema.parse(
          await context.apiClient.get(`characters/${character.characterId}`),
        );

        // Verify character data matches
        expect(response).toStrictEqual(character);
      });
    });
  });
});
