import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { randomUUID } from "crypto";
import {
  postSpecialAbilitiesResponseSchema,
  MAX_STRING_LENGTH_DEFAULT,
  PostSpecialAbilitiesResponse,
  Character,
  HistoryRecord,
} from "api-spec";
import { expectApiError, commonInvalidTestCases, updateAndVerifyTestContextAfterEachTest } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext, setTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

export function makeUniqueName(prefix: string): string {
  return `${prefix}-${getTestContext().character?.characterId}-${randomUUID().slice(0, 8)}`;
}

describe.sequential("post-special-abilities component tests", () => {
  let currentResponse: PostSpecialAbilitiesResponse | undefined;

  beforeAll(async () => {
    await setupTestContext();
  });

  afterAll(async () => {
    await cleanUpTestContext();
  });

  afterEach(async () => {
    await updateAndVerifyTestContextAfterEachTest(
      currentResponse,
      (response: PostSpecialAbilitiesResponse, character: Character) => {
        character.characterSheet.specialAbilities = response.data.specialAbilities.new.values;
      },
      (response: PostSpecialAbilitiesResponse, record: HistoryRecord) => {
        if (response.historyRecord) {
          record = response.historyRecord;
        }
      },
    );
    currentResponse = undefined;
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
          ? `characters/${_case.characterId}/special-abilities`
          : `characters/${character.characterId}/special-abilities`;
        const client = new ApiClient(getTestContext().apiBaseUrl, authorizationHeader);

        await expectApiError(
          () =>
            client.post(path, {
              specialAbility: "Iron Will",
            }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    test("special ability name exceeds max length", async () => {
      await expectApiError(
        () =>
          apiClient.post(`characters/${getTestContext().character.characterId}/special-abilities`, {
            specialAbility: "x".repeat(MAX_STRING_LENGTH_DEFAULT + 1),
          }),
        400,
        "Invalid input values",
      );
    });
  });

  /**
   * =============================
   * Idempotent requests
   * =============================
   */

  describe("Idempotent requests", () => {
    test("special ability already exists (idempotency)", async () => {
      const ability = getTestContext().character.characterSheet.specialAbilities[0];
      const character = getTestContext().character;

      expect(ability).toBeDefined();
      expect(ability).not.toBe("");

      const response = postSpecialAbilitiesResponseSchema.parse(
        await apiClient.post(`characters/${character.characterId}/special-abilities`, {
          specialAbility: ability,
        }),
      );
      /**
       * Notice: The response is not stored in the currentResponse variable
       * because we explicitly do not want to update the local test context.
       * This is because we want to verify that the local test context is
       * still identical to the backend character after the update (idempotency).
       */

      expect(response.data.characterId).toBe(character.characterId);
      expect(response.data.userId).toBe(character.userId);
      expect(response.data.specialAbilityName).toBe(ability);
      expect(response.data.specialAbilities.old.values).toEqual(character.characterSheet.specialAbilities);
      expect(response.data.specialAbilities.new).toStrictEqual(response.data.specialAbilities.old);
      expect(response.data.specialAbilities.new.values).toContain(ability);
      expect(response.historyRecord).toBeNull();
    });
  });

  /**
   * =============================
   * Update requests
   * =============================
   */

  describe("Update requests", () => {
    test("add new special ability", async () => {
      const ability = makeUniqueName("ComponentAbility");
      const character = getTestContext().character;

      const response = postSpecialAbilitiesResponseSchema.parse(
        await apiClient.post(`characters/${character.characterId}/special-abilities`, {
          specialAbility: ability,
        }),
      );
      currentResponse = response;

      expect(response.data.characterId).toBe(character.characterId);
      expect(response.data.userId).toBe(character.userId);
      expect(response.data.specialAbilityName).toBe(ability);
      expect(response.data.specialAbilities.old.values).toEqual(character.characterSheet.specialAbilities);
      expect(response.data.specialAbilities.old.values).not.toContain(ability);
      expect(response.data.specialAbilities.new.values).toContain(ability);
      // Verify the new special abilities array contains the old values plus the new one (order doesn't matter due to Set storage)
      const expectedNewAbilities = new Set([...response.data.specialAbilities.old.values, ability]);
      const actualNewAbilities = new Set(response.data.specialAbilities.new.values);
      expect(actualNewAbilities).toEqual(expectedNewAbilities);
      expect(response.historyRecord).not.toBeNull();
    });
  });
});
