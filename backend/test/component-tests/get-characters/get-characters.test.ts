import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { characterSchema, characterShortSchema, getCharactersResponseSchema } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { ApiClient } from "../api-client.js";
import { TestContextFactory, TestContext } from "../test-context-factory.js";

describe.sequential("get-characters component tests", () => {
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
    // Test cases with characterId are not applicable for this endpoint
    const testCasesWithoutCharacterId = commonInvalidTestCases.filter(_case => !_case.characterId);

    testCasesWithoutCharacterId.forEach((_case) => {
      test(_case.name, async () => {
        const authorizationHeader = _case.authorizationHeader ?? context.authorizationHeader;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(() => client.get("characters"), _case.expectedStatusCode, _case.expectedErrorMessage);
      });
    });
  });

  /**
   * =============================
   * Valid requests
   * =============================
   */

  describe("Valid requests", () => {
    test("successfully get characters", async () => {
      const response = getCharactersResponseSchema.parse(await context.apiClient.get("characters"));

      response.characters.forEach((character) => {
        // Check that the character schema is valid
        characterSchema.parse(character);
        // Check that all characters have the same userId as the input
        expect(character.userId).toBe(context.character.userId);
      });

      expect(response.characters.length).toBeGreaterThan(0);
      const character = response.characters.find((entry) => entry.characterId === context.character.characterId);
      expect(character).toBeDefined();
      expect(character).toStrictEqual(context.character);
    });

    test("successfully get characters in short form", async () => {
      const response = getCharactersResponseSchema.parse(
        await context.apiClient.get("characters", { "character-short": true }),
      );

      expect(response.characters.length).toBeGreaterThan(0);
      const character = response.characters.find((entry) => entry.characterId === context.character.characterId);
      expect(character).toBeDefined();

      response.characters.forEach((character) => {
        // Check that the character schema is valid
        characterShortSchema.parse(character);
        // Check that all characters have the same userId as the input
        expect(character.userId).toBe(context.character.userId);
      });

      // Type narrowing - this should be characterShortSchema since we used "character-short": true
      if ("name" in character!) {
        expect(character!.name).toBe(context.character.characterSheet.generalInformation.name);
        expect(character!.level).toBe(context.character.characterSheet.generalInformation.level);
      } else {
        throw new Error("Expected character short form but got full character form");
      }
    });
  });
});
