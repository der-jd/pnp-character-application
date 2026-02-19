import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { randomUUID } from "crypto";
import { postSpecialAbilitiesResponseSchema, MAX_STRING_LENGTH_DEFAULT } from "api-spec";
import { expectApiError, verifyCharacterState, verifyLatestHistoryRecord, commonInvalidTestCases } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

export function makeUniqueName(prefix: string): string {
  return `${prefix}-${getTestContext().character?.characterId}-${randomUUID().slice(0, 8)}`;
}

describe("add-special-ability component tests", () => {
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

      expect(ability).toBeDefined();
      expect(ability).not.toBe("");

      const response = postSpecialAbilitiesResponseSchema.parse(
        await apiClient.post(`characters/${getTestContext().character.characterId}/special-abilities`, {
          specialAbility: ability,
        }),
      );

      expect(response.data.characterId).toBe(getTestContext().character.characterId);
      expect(response.data.userId).toBe(getTestContext().character.userId);
      expect(response.data.specialAbilityName).toBe(ability);
      expect(response.data.specialAbilities.old.values).toEqual(
        getTestContext().character.characterSheet.specialAbilities,
      );
      expect(response.data.specialAbilities.new).toStrictEqual(response.data.specialAbilities.old);
      expect(response.data.specialAbilities.new.values).toContain(ability);
      expect(response.historyRecord).toBeNull();

      // Character from the backend should be still identical to the one before the update
      await verifyCharacterState(getTestContext().character.characterId, getTestContext().character);

      // Latest history record should be the same as the one before the update
      await verifyLatestHistoryRecord(getTestContext().character.characterId, getTestContext().lastHistoryRecord);
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

      const response = postSpecialAbilitiesResponseSchema.parse(
        await apiClient.post(`characters/${getTestContext().character.characterId}/special-abilities`, {
          specialAbility: ability,
        }),
      );

      expect(response.data.characterId).toBe(getTestContext().character.characterId);
      expect(response.data.userId).toBe(getTestContext().character.userId);
      expect(response.data.specialAbilityName).toBe(ability);
      expect(response.data.specialAbilities.old.values).toEqual(
        getTestContext().character.characterSheet.specialAbilities,
      );
      expect(response.data.specialAbilities.old.values).not.toContain(ability);
      expect(response.data.specialAbilities.new.values).toContain(ability);
      // Verify the new special abilities array contains the old values plus the new one
      const expectedNewAbilities = [...response.data.specialAbilities.old.values, ability];
      expect(response.data.specialAbilities.new.values).toStrictEqual(expectedNewAbilities);
      expect(response.historyRecord).not.toBeNull();

      // Update test context
      getTestContext().character.characterSheet.specialAbilities = response.data.specialAbilities.new.values;
      getTestContext().lastHistoryRecord = response.historyRecord!;

      await verifyCharacterState(getTestContext().character.characterId, getTestContext().character);
      await verifyLatestHistoryRecord(getTestContext().character.characterId, getTestContext().lastHistoryRecord);
    });
  });
});
