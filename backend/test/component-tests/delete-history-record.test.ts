import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  deleteHistoryRecordResponseSchema,
  postLevelUpResponseSchema,
  getLevelUpResponseSchema,
  patchBaseValueResponseSchema,
  patchCalculationPointsResponseSchema,
  patchAttributeResponseSchema,
  patchSkillResponseSchema,
  patchCombatStatsResponseSchema,
  postSpecialAbilitiesResponseSchema,
  LEVEL_UP_DICE_EXPRESSION,
  BaseValues,
  Attributes,
} from "api-spec";
import {
  expectApiError,
  commonInvalidTestCases,
  updateAndVerifyTestContextAfterEachTest,
  INVALID_UUID,
  NON_EXISTENT_UUID,
} from "./shared.js";
import { ApiClient } from "./api-client.js";
import { TestContext, TestContextFactory } from "./test-context-factory.js";

describe.sequential("delete-history-record component tests", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await TestContextFactory.createContext();
  });

  afterAll(async () => {
    await TestContextFactory.cleanupContext(context);
  });

  afterEach(async () => {
    await updateAndVerifyTestContextAfterEachTest(
      context,
      undefined,
      () => {
        /**
         * No update needed because the character should be the same
         * as before the update and the following revert request
         * in the test cases.
         */
      },
      () => {
        /**
         * No update needed because the history record should be the same
         * as before the update and the following revert request
         * in the test cases.
         */
      },
    );
  });

  /**
   * =============================
   * Invalid requests
   * =============================
   */

  describe("Invalid requests", () => {
    // Update expected error message for "no character found for non-existing character id" test case
    const testCases = commonInvalidTestCases.map((testCase) =>
      testCase.name === "no character found for non-existing character id"
        ? { ...testCase, expectedErrorMessage: "No history found for the given character id" }
        : testCase
    );

    testCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;

        const authorizationHeader = _case.authorizationHeader ?? context.authorizationHeader;
        const path = _case.characterId
          ? `characters/${_case.characterId}/history/${context.lastHistoryRecord.id}`
          : `characters/${character.characterId}/history/${context.lastHistoryRecord.id}`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(() => client.delete(path), _case.expectedStatusCode, _case.expectedErrorMessage);
      });
    });

    test("record id is not an uuid", async () => {
      const character = context.character;

      await expectApiError(
        () => context.apiClient.delete(`characters/${character.characterId}/history/${INVALID_UUID}`),
        400,
        "Invalid input values",
      );
    });

    test("given record id does not match the latest change", async () => {
      const character = context.character;

      await expectApiError(
        () => context.apiClient.delete(`characters/${character.characterId}/history/${NON_EXISTENT_UUID}`),
        404,
        "The latest record does not match the given id",
      );
    });
  });

  /**
   * =============================
   * Valid requests
   * =============================
   */

  describe("Valid requests", () => {
    test("Delete history record for a changed level", async () => {
      const character = context.character;
      const client = context.apiClient;

      // Post a level up
      const optionsHash = getLevelUpResponseSchema.parse(
        await client.get(`characters/${character.characterId}/level-up`),
      ).optionsHash;
      const body = {
        initialLevel: character.characterSheet.generalInformation.level,
        effect: { kind: "hpRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 } },
        optionsHash: optionsHash,
      };
      const updateResponse = postLevelUpResponseSchema.parse(
        await client.post(`characters/${character.characterId}/level-up`, body),
      );

      // Check if the character has been actually updated
      expect(updateResponse.data.changes.new.levelUpProgress).not.toStrictEqual(
        character.characterSheet.generalInformation.levelUpProgress,
      );
      expect(updateResponse.historyRecord).toBeDefined();

      // Revert the level up
      deleteHistoryRecordResponseSchema.parse(
        await client.delete(`characters/${character.characterId}/history/${updateResponse.historyRecord?.id}`),
      );
    });

    test.each([
      {
        name: "healthPoints",
        baseValue: "healthPoints" as keyof BaseValues,
        expectedCombatStats: undefined,
      },
      {
        name: "attackBaseValue with melee combat stats",
        baseValue: "attackBaseValue" as keyof BaseValues,
        expectedCombatStats: "melee",
      },
      {
        name: "rangedAttackBaseValue with ranged combat stats",
        baseValue: "rangedAttackBaseValue" as keyof BaseValues,
        expectedCombatStats: "ranged",
      },
    ])("Delete history record for a changed base value: $name", async ({ baseValue, expectedCombatStats }) => {
      const character = context.character;
      const client = context.apiClient;

      // Patch a base value
      const body = {
        mod: {
          initialValue: character.characterSheet.baseValues[baseValue].mod,
          newValue: character.characterSheet.baseValues[baseValue].mod + 5,
        },
      };
      const updateResponse = patchBaseValueResponseSchema.parse(
        await client.patch(`characters/${character.characterId}/base-values/${baseValue}`, body),
      );

      // Check if the character has been actually updated
      expect(updateResponse.data.changes.new.baseValue).not.toStrictEqual(
        character.characterSheet.baseValues[baseValue],
      );

      if (expectedCombatStats === "melee") {
        expect(updateResponse.data.changes.new.combat?.melee).toBeDefined();
      } else if (expectedCombatStats === "ranged") {
        expect(updateResponse.data.changes.new.combat?.ranged).toBeDefined();
      }

      expect(updateResponse.historyRecord).toBeDefined();

      // Revert the base value update
      deleteHistoryRecordResponseSchema.parse(
        await client.delete(`characters/${character.characterId}/history/${updateResponse.historyRecord?.id}`),
      );
    });

    test("Delete history record for changed calculation points", async () => {
      const character = context.character;
      const client = context.apiClient;

      // Patch calculation points
      const body = {
        adventurePoints: {
          total: {
            initialValue: character.characterSheet.calculationPoints.adventurePoints.total,
            increasedPoints: 10,
          },
        },
      };
      const updateResponse = patchCalculationPointsResponseSchema.parse(
        await client.patch(`characters/${character.characterId}/calculation-points`, body),
      );

      // Check if the character has been actually updated
      expect(updateResponse.data.calculationPoints.new.adventurePoints).not.toStrictEqual(
        character.characterSheet.calculationPoints.adventurePoints,
      );
      expect(updateResponse.historyRecord).toBeDefined();

      // Revert the calculation points update
      deleteHistoryRecordResponseSchema.parse(
        await client.delete(`characters/${character.characterId}/history/${updateResponse.historyRecord?.id}`),
      );
    });

    const attributeTestCases = [
      {
        name: "intelligence",
        attribute: "intelligence" as keyof Attributes,
        expectedBaseValues: false,
        expectedCombat: false,
      },
      {
        name: "mentalResilience with base values",
        attribute: "mentalResilience" as keyof Attributes,
        expectedBaseValues: true,
        expectedCombat: false,
      },
      {
        name: "courage with base values and combat stats",
        attribute: "courage" as keyof Attributes,
        expectedBaseValues: true,
        expectedCombat: true,
      },
    ];
    test.each(attributeTestCases)(
      "Delete history record for a changed attribute: $name",
      async ({ attribute, expectedBaseValues, expectedCombat }) => {
        const character = context.character;
        const client = context.apiClient;

        // Patch an attribute
        const body = {
          current: {
            initialValue: character.characterSheet.attributes[attribute].current,
            increasedPoints: 6,
          },
        };
        const updateResponse = patchAttributeResponseSchema.parse(
          await client.patch(`characters/${character.characterId}/attributes/${attribute}`, body),
        );

        // Check if the character has been actually updated
        expect(updateResponse.data.changes.new.attribute).not.toStrictEqual(
          character.characterSheet.attributes[attribute],
        );

        if (expectedBaseValues) {
          expect(updateResponse.data.changes.new.baseValues).toBeDefined();
        }

        if (expectedCombat) {
          expect(updateResponse.data.changes.new.combat).toBeDefined();
        }

        expect(updateResponse.historyRecord).toBeDefined();

        // Revert the attribute update
        deleteHistoryRecordResponseSchema.parse(
          await client.delete(`characters/${character.characterId}/history/${updateResponse.historyRecord?.id}`),
        );
      },
    );

    test.each([
      {
        name: "athletics",
        skillPath: "body/athletics",
        expectedCombatStats: false,
      },
      {
        name: "martialArts with combat stats",
        skillPath: "combat/martialArts",
        expectedCombatStats: true,
      },
    ])("Delete history record for a changed skill: $name", async ({ skillPath, expectedCombatStats }) => {
      const character = context.character;
      const client = context.apiClient;

      // Extract skill name from skillPath using split
      const skillName = skillPath.split("/")[1];
      const skillCategory = skillPath.split("/")[0];
      const skill = (character.characterSheet.skills as any)[skillCategory][skillName];

      // Patch a skill
      const body = {
        current: {
          initialValue: skill.current,
          increasedPoints: 10,
        },
        learningMethod: "NORMAL",
      };
      const updateResponse = patchSkillResponseSchema.parse(
        await client.patch(`characters/${character.characterId}/skills/${skillPath}`, body),
      );

      // Check if the character has been actually updated
      expect(updateResponse.data.changes.new.skill).not.toStrictEqual(skill);

      if (expectedCombatStats) {
        expect(updateResponse.data.changes.new.combatStats).toBeDefined();
      }

      expect(updateResponse.historyRecord).toBeDefined();

      // Revert the skill update
      deleteHistoryRecordResponseSchema.parse(
        await client.delete(`characters/${character.characterId}/history/${updateResponse.historyRecord?.id}`),
      );
    });

    test("Delete history record for changed combat stats", async () => {
      const character = context.character;
      const client = context.apiClient;

      // Patch combat stats
      const body = {
        skilledAttackValue: {
          initialValue: character.characterSheet.combat.melee.daggers.skilledAttackValue,
          increasedPoints: 1,
        },
        skilledParadeValue: {
          initialValue: character.characterSheet.combat.melee.daggers.skilledParadeValue,
          increasedPoints: 0,
        },
      };
      const updateResponse = patchCombatStatsResponseSchema.parse(
        await client.patch(`characters/${character.characterId}/combat/melee/daggers`, body),
      );

      // Check if the character has been actually updated
      expect(updateResponse.data.combatStats.new).not.toStrictEqual(character.characterSheet.combat.melee.daggers);
      expect(updateResponse.historyRecord).toBeDefined();

      // Revert the combat stats update
      deleteHistoryRecordResponseSchema.parse(
        await client.delete(`characters/${character.characterId}/history/${updateResponse.historyRecord?.id}`),
      );
    });

    test("Delete history record for changed special abilities", async () => {
      const character = context.character;
      const client = context.apiClient;

      // Add a special ability
      const body = {
        specialAbility: "Spellcasting",
      };
      const updateResponse = postSpecialAbilitiesResponseSchema.parse(
        await client.post(`characters/${character.characterId}/special-abilities`, body),
      );

      // Check if the character has been actually updated
      expect(updateResponse.data.specialAbilities.new.values).not.toStrictEqual(
        character.characterSheet.specialAbilities,
      );
      expect(updateResponse.historyRecord).toBeDefined();

      // Revert the special ability addition
      deleteHistoryRecordResponseSchema.parse(
        await client.delete(`characters/${character.characterId}/history/${updateResponse.historyRecord?.id}`),
      );
    });
  });
});
