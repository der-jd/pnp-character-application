import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { randomUUID } from "crypto";
import {
  postSpecialAbilitiesResponseSchema,
  MAX_STRING_LENGTH_DEFAULT,
  PostSpecialAbilitiesResponse,
  PostSpecialAbilitiesHistoryRecord,
  Character,
  HistoryRecord,
  HistoryRecordType,
} from "api-spec";
import { expectApiError, commonInvalidTestCases, updateAndVerifyTestContextAfterEachTest } from "./shared.js";
import { ApiClient } from "./api-client.js";
import { TestContextFactory, TestContext } from "./test-context-factory.js";

describe.sequential("post-special-abilities component tests", () => {
  let context: TestContext;
  let currentResponse: PostSpecialAbilitiesResponse | undefined;

  beforeAll(async () => {
    context = await TestContextFactory.createContext();
  });

  afterAll(async () => {
    await TestContextFactory.cleanupContext(context);
  });

  afterEach(async () => {
    await updateAndVerifyTestContextAfterEachTest(
      context,
      currentResponse,
      (response: PostSpecialAbilitiesResponse, character: Character) => {
        character.characterSheet.specialAbilities = response.data.specialAbilities.new.values;
      },
      (response: PostSpecialAbilitiesResponse, record: HistoryRecord) => {
        if (response.historyRecord) {
          Object.assign(record, response.historyRecord);
        }
      },
    );
    currentResponse = undefined;
  });

  function makeUniqueName(prefix: string): string {
    return `${prefix}-${context.character?.characterId}-${randomUUID().slice(0, 8)}`;
  }

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
        const path = _case.characterId
          ? `characters/${_case.characterId}/special-abilities`
          : `characters/${character.characterId}/special-abilities`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

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
          context.apiClient.post(`characters/${context.character.characterId}/special-abilities`, {
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
      const ability = context.character.characterSheet.specialAbilities[0];
      const character = context.character;

      expect(ability).toBeDefined();
      expect(ability).not.toBe("");

      const response = postSpecialAbilitiesResponseSchema.parse(
        await context.apiClient.post(`characters/${character.characterId}/special-abilities`, {
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
      const character = context.character;

      const response = postSpecialAbilitiesResponseSchema.parse(
        await context.apiClient.post(`characters/${character.characterId}/special-abilities`, {
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

      const historyRecord = response.historyRecord as PostSpecialAbilitiesHistoryRecord;

      // Verify basic record properties
      expect(historyRecord.name).toBeDefined();
      expect(historyRecord.number).toBeGreaterThan(0);
      expect(historyRecord.timestamp).toBeDefined();
      expect(historyRecord.type).toBe(HistoryRecordType.SPECIAL_ABILITIES_CHANGED);
      expect(historyRecord.id).toBeDefined();
      expect(historyRecord.learningMethod).toBeNull();

      // Verify record data matches response changes
      expect(historyRecord.data.old).toStrictEqual(response.data.specialAbilities.old);
      expect(historyRecord.data.new).toStrictEqual(response.data.specialAbilities.new);

      // Verify calculation points changes in history
      expect(historyRecord.calculationPoints).toBeDefined();
      expect(historyRecord.calculationPoints.adventurePoints).toBeNull();
      expect(historyRecord.calculationPoints.attributePoints).toBeNull();

      expect(historyRecord.comment).toBeNull();
    });
  });
});
