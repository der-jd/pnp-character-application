import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { deleteCharacterResponseSchema } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "./shared.js";
import { ApiClient } from "./api-client.js";
import { TestContext, TestContextFactory } from "./test-context-factory.js";

describe.sequential("delete-character component tests", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await TestContextFactory.createContext();
  });

  afterAll(async () => {
    // Skip cleanup for delete-character test since the character is already deleted by the test
  });

  /**
   * =============================
   * Invalid requests
   * =============================
   */

  describe("Invalid requests", () => {
    const invalidTestCases = [
      ...commonInvalidTestCases.map((_case) => {
        // Override the error message for non-existing character case specific to delete endpoint
        if (_case.name === "no character found for non-existing character id") {
          return {
            ..._case,
            expectedErrorMessage: "No character was deleted because it did not exist",
          };
        }
        return _case;
      }),
    ];

    invalidTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;

        const authorizationHeader = _case.authorizationHeader ?? context.authorizationHeader;
        const path = _case.characterId ? `characters/${_case.characterId}` : `characters/${character.characterId}`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(() => client.delete(path), _case.expectedStatusCode, _case.expectedErrorMessage);
      });
    });
  });

  /**
   * =============================
   * Valid requests
   * =============================
   */

  describe("Valid requests", () => {
    test("successfully delete a character", async () => {
      const character = context.character;

      const response = deleteCharacterResponseSchema.parse(
        await context.apiClient.delete(`characters/${character.characterId}`),
      );

      // Verify response structure
      expect(response.userId).toBe(context.userId);
      expect(response.characterId).toBe(character.characterId);

      // Verify character is actually deleted by trying to get it
      await expectApiError(
        () => context.apiClient.get(`characters/${character.characterId}`),
        404,
        "No character found",
      );

      // Verify history is also deleted
      await expectApiError(
        () => context.apiClient.get(`characters/${character.characterId}/history`),
        404,
        "No character found",
      );
    });
  });
});
