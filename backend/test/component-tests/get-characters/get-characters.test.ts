import { describe, expect, test } from "vitest";
import { characterSchema, characterShortSchema, getCharactersResponseSchema } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { apiClient } from "../setup.js";
import { ApiClient } from "../api-client.js";
import { getTestContext } from "../test-context.js";

describe.sequential("get-characters component tests", () => {
  /**
   * =============================
   * Invalid requests
   * =============================
   */

  describe("Invalid requests", () => {
    commonInvalidTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const authorizationHeader = _case.authorizationHeader ?? getTestContext().authorizationHeader;
        const client = new ApiClient(getTestContext().apiBaseUrl, authorizationHeader);

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
      const response = getCharactersResponseSchema.parse(await apiClient.get("characters"));

      response.characters.forEach((character) => {
        // Check that the character schema is valid
        characterSchema.parse(character);
        // Check that all characters have the same userId as the input
        expect(character.userId).toBe(getTestContext().character.userId);
      });

      expect(response.characters.length).toBeGreaterThan(0);
      const character = response.characters.find(
        (entry) => entry.characterId === getTestContext().character.characterId,
      );
      expect(character).toBeDefined();
      expect(character).toStrictEqual(getTestContext().character);
    });

    test("successfully get characters in short form", async () => {
      const response = getCharactersResponseSchema.parse(
        await apiClient.get("characters", { "character-short": true }),
      );

      expect(response.characters.length).toBeGreaterThan(0);
      const character = response.characters.find(
        (entry) => entry.characterId === getTestContext().character.characterId,
      );
      expect(character).toBeDefined();

      response.characters.forEach((character) => {
        // Check that the character schema is valid
        characterShortSchema.parse(character);
        // Check that all characters have the same userId as the input
        expect(character.userId).toBe(getTestContext().character.userId);
      });

      // Type narrowing - this should be characterShortSchema since we used "character-short": true
      if ("name" in character!) {
        expect(character!.name).toBe(getTestContext().character.characterSheet.generalInformation.name);
        expect(character!.level).toBe(getTestContext().character.characterSheet.generalInformation.level);
      } else {
        throw new Error("Expected character short form but got full character form");
      }
    });
  });
});
