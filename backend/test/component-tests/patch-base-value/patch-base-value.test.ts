import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  Character,
  HistoryRecord,
  PatchBaseValueResponse,
  patchBaseValueResponseSchema,
  CharacterSheet,
  BaseValues,
  CombatStats,
  HistoryRecordType,
  PatchBaseValueHistoryRecord,
  BaseValue,
  PatchBaseValueRequest,
} from "api-spec";
import { commonInvalidTestCases, expectApiError, updateAndVerifyTestContextAfterEachTest } from "../shared.js";
import { TestContext, TestContextFactory } from "../test-context-factory.js";
import { ApiClient } from "../api-client.js";

describe.sequential("patch-base-value component tests", () => {
  let context: TestContext;
  let currentResponse: PatchBaseValueResponse | undefined;

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
      (response: PatchBaseValueResponse, character: Character) => {
        character.characterSheet.baseValues[response.data.baseValueName as keyof BaseValues] = response.data.changes.new
          .baseValue as BaseValue;

        // Update combat stats if they changed
        if (response.data.changes.new.combat) {
          if (response.data.changes.new.combat.melee) {
            for (const [skillName, combatStats] of Object.entries(response.data.changes.new.combat.melee)) {
              character.characterSheet.combat.melee[skillName as keyof CharacterSheet["combat"]["melee"]] =
                combatStats as CombatStats;
            }
          }
          if (response.data.changes.new.combat.ranged) {
            for (const [skillName, combatStats] of Object.entries(response.data.changes.new.combat.ranged)) {
              character.characterSheet.combat.ranged[skillName as keyof CharacterSheet["combat"]["ranged"]] =
                combatStats as CombatStats;
            }
          }
        }
      },
      (response: PatchBaseValueResponse, record: HistoryRecord) => {
        if (response.historyRecord) {
          Object.assign(record, response.historyRecord);
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
        const character = context.character;

        const authorizationHeader = _case.authorizationHeader ?? context.authorizationHeader;
        const path = _case.characterId
          ? `characters/${_case.characterId}/base-values/healthPoints`
          : `characters/${character.characterId}/base-values/healthPoints`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(
          () =>
            client.patch(path, {
              mod: {
                initialValue: character.characterSheet.baseValues.healthPoints.mod,
                newValue: character.characterSheet.baseValues.healthPoints.mod + 1,
              },
            }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    test("passed initial start value doesn't match the value in the backend", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/base-values/healthPoints`, {
            start: {
              initialValue: character.characterSheet.baseValues.healthPoints.start + 1,
              newValue: character.characterSheet.baseValues.healthPoints.start + 2,
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial mod value doesn't match the value in the backend", async () => {
      const character = context.character;

      const error = await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/base-values/healthPoints`, {
            mod: {
              initialValue: character.characterSheet.baseValues.healthPoints.mod + 1,
              newValue: character.characterSheet.baseValues.healthPoints.mod + 2,
            },
          }),
        409,
        "doesn't match",
      );

      expect(error.context?.backendModValue).toBe(character.characterSheet.baseValues.healthPoints.mod);
    });
  });

  /**
   * =============================
   * Idempotent requests
   * =============================
   */

  describe("Idempotent requests", () => {
    const idempotentTestCases = [
      {
        name: "base value has already been updated to the target start value (idempotency)",
        baseValueName: "healthPoints",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.baseValues.healthPoints.start - 10,
            newValue: character.characterSheet.baseValues.healthPoints.start,
          },
        }),
      },
      {
        name: "base value has already been updated to the target mod value (idempotency)",
        baseValueName: "healthPoints",
        getBody: (character: Character) => ({
          mod: {
            initialValue: character.characterSheet.baseValues.healthPoints.mod - 7,
            newValue: character.characterSheet.baseValues.healthPoints.mod,
          },
        }),
      },
    ];

    idempotentTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const body = _case.getBody(character);

        const response = patchBaseValueResponseSchema.parse(
          await context.apiClient.patch(`characters/${character.characterId}/base-values/${_case.baseValueName}`, body),
        );
        /**
         * Notice: The response is not stored in the currentResponse variable
         * because we explicitly do not want to update the local test context.
         * This is because we want to verify that the local test context is
         * still identical to the backend character after the update (idempotency).
         */

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.baseValueName).toBe(_case.baseValueName);

        // Verify idempotency - no history record
        expect(response.historyRecord).toBeNull();

        // Verify base value updates
        if ("start" in body) {
          expect(response.data.changes.new.baseValue.start).toBe(body.start.newValue);
        }

        if ("mod" in body) {
          expect(response.data.changes.new.baseValue.mod).toBe(body.mod.newValue);
        }

        expect(response.data.changes.old.baseValue).toStrictEqual(
          character.characterSheet.baseValues[_case.baseValueName as keyof BaseValues],
        );
        expect(response.data.changes.new.baseValue).toStrictEqual(response.data.changes.old.baseValue);

        // Verify no combat stats changes
        expect(response.data.changes.old.combat).toBeUndefined();
        expect(response.data.changes.new.combat).toBeUndefined();
      });
    });
  });

  /**
   * =============================
   * Base values changes
   * =============================
   */

  describe("Base values changes", () => {
    const baseValueTestCases = [
      {
        name: "update start value of healthPoints",
        baseValueName: "healthPoints",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.baseValues.healthPoints.start,
            newValue: character.characterSheet.baseValues.healthPoints.start - 10,
          },
        }),
      },
      {
        name: "update start value of attackBaseValue -> no changes to melee combat stats",
        baseValueName: "attackBaseValue",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.baseValues.attackBaseValue.start,
            newValue: character.characterSheet.baseValues.attackBaseValue.start + 10,
          },
        }),
      },
      {
        name: "update start value of rangedAttackBaseValue -> no changes to ranged combat stats",
        baseValueName: "rangedAttackBaseValue",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.baseValues.rangedAttackBaseValue.start,
            newValue: character.characterSheet.baseValues.rangedAttackBaseValue.start + 10,
          },
        }),
      },
      {
        name: "update mod value of healthPoints",
        baseValueName: "healthPoints",
        getBody: (character: Character) => ({
          mod: {
            initialValue: character.characterSheet.baseValues.healthPoints.mod,
            newValue: character.characterSheet.baseValues.healthPoints.mod + 3,
          },
        }),
      },
      {
        name: "update all values (start, mod) of healthPoints",
        baseValueName: "healthPoints",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.baseValues.healthPoints.start,
            newValue: character.characterSheet.baseValues.healthPoints.start - 10,
          },
          mod: {
            initialValue: character.characterSheet.baseValues.healthPoints.mod,
            newValue: character.characterSheet.baseValues.healthPoints.mod + 3,
          },
        }),
      },
    ];

    baseValueTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const body = _case.getBody(character);

        const response = patchBaseValueResponseSchema.parse(
          await context.apiClient.patch(`characters/${character.characterId}/base-values/${_case.baseValueName}`, body),
        );
        currentResponse = response;

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.baseValueName).toBe(_case.baseValueName);

        // Verify base value updates
        const baseValueOld = character.characterSheet.baseValues[_case.baseValueName as keyof BaseValues] as BaseValue;
        expect(response.data.changes.old.baseValue).toStrictEqual(baseValueOld);

        expect(response.data.changes.new.baseValue.byFormula).toBe(baseValueOld.byFormula);
        expect(response.data.changes.new.baseValue.current).toBe(baseValueOld.current);
        expect(response.data.changes.new.baseValue.byLvlUp).toBe(baseValueOld.byLvlUp);

        if ("start" in body) {
          expect(response.data.changes.new.baseValue.start).toBe((body as any).start.newValue);
        }

        if ("mod" in body) {
          expect(response.data.changes.new.baseValue.mod).toBe((body as any).mod.newValue);
        }

        expect(response.data.changes.old.combat).toBeUndefined();
        expect(response.data.changes.new.combat).toBeUndefined();

        // Verify history record was created
        expect(response.historyRecord).not.toBeNull();

        const historyRecord = response.historyRecord as PatchBaseValueHistoryRecord;

        // Verify basic record properties
        expect(historyRecord.type).toBe(HistoryRecordType.BASE_VALUE_CHANGED);
        expect(historyRecord.name).toBe(_case.baseValueName);
        expect(historyRecord.number).toBeGreaterThan(0);
        expect(historyRecord.id).toBeDefined();
        expect(historyRecord.timestamp).toBeDefined();

        // Verify record data matches response changes
        expect(historyRecord.data.old).toStrictEqual(response.data.changes.old);
        expect(historyRecord.data.new).toStrictEqual(response.data.changes.new);

        expect(historyRecord.calculationPoints.attributePoints).toBeNull();
        expect(historyRecord.calculationPoints.adventurePoints).toBeNull();

        expect(historyRecord.data.old.baseValue).toBeDefined();
        expect(historyRecord.data.new.baseValue).toBeDefined();

        expect(historyRecord.data.old.combat).toBeUndefined();
        expect(historyRecord.data.new.combat).toBeUndefined();

        expect(historyRecord.comment).toBeNull();
      });
    });
  });

  /**
   * =============================
   * Combat stats changes
   * =============================
   */

  describe("Combat stats changes", () => {
    const combatStatsTestCases = [
      {
        name: "update mod value of attackBaseValue -> changes to melee combat stats",
        baseValueName: "attackBaseValue",
        getBody: (character: Character) => ({
          mod: {
            initialValue: character.characterSheet.baseValues.attackBaseValue.mod,
            newValue: character.characterSheet.baseValues.attackBaseValue.mod + 10,
          },
        }),
      },
      {
        name: "update mod value of paradeBaseValue -> changes to melee combat stats",
        baseValueName: "paradeBaseValue",
        getBody: (character: Character) => ({
          mod: {
            initialValue: character.characterSheet.baseValues.paradeBaseValue.mod,
            newValue: character.characterSheet.baseValues.paradeBaseValue.mod + 10,
          },
        }),
      },
      {
        name: "update mod value of rangedAttackBaseValue -> changes to ranged combat stats",
        baseValueName: "rangedAttackBaseValue",
        getBody: (character: Character) => ({
          mod: {
            initialValue: character.characterSheet.baseValues.rangedAttackBaseValue.mod,
            newValue: character.characterSheet.baseValues.rangedAttackBaseValue.mod + 10,
          },
        }),
      },
      {
        name: "update all values (start, mod) of attackBaseValue -> changes to melee combat stats",
        baseValueName: "attackBaseValue",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.baseValues.attackBaseValue.start,
            newValue: character.characterSheet.baseValues.attackBaseValue.start + 20,
          },
          mod: {
            initialValue: character.characterSheet.baseValues.attackBaseValue.mod,
            newValue: character.characterSheet.baseValues.attackBaseValue.mod + 5,
          },
        }),
      },
      {
        name: "update all values (start, mod) of paradeBaseValue -> changes to melee combat stats",
        baseValueName: "paradeBaseValue",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.baseValues.paradeBaseValue.start,
            newValue: character.characterSheet.baseValues.paradeBaseValue.start + 20,
          },
          mod: {
            initialValue: character.characterSheet.baseValues.paradeBaseValue.mod,
            newValue: character.characterSheet.baseValues.paradeBaseValue.mod + 5,
          },
        }),
      },
      {
        name: "update all values (start, mod) of rangedAttackBaseValue -> changes to ranged combat stats",
        baseValueName: "rangedAttackBaseValue",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.baseValues.rangedAttackBaseValue.start,
            newValue: character.characterSheet.baseValues.rangedAttackBaseValue.start + 20,
          },
          mod: {
            initialValue: character.characterSheet.baseValues.rangedAttackBaseValue.mod,
            newValue: character.characterSheet.baseValues.rangedAttackBaseValue.mod + 5,
          },
        }),
      },
    ];

    combatStatsTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const body: PatchBaseValueRequest = _case.getBody(character);

        const response = patchBaseValueResponseSchema.parse(
          await context.apiClient.patch(`characters/${character.characterId}/base-values/${_case.baseValueName}`, body),
        );
        currentResponse = response;

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.baseValueName).toBe(_case.baseValueName);

        // Check old and new base value
        const baseValueOld = character.characterSheet.baseValues[_case.baseValueName as keyof BaseValues] as BaseValue;
        expect(response.data.changes.old.baseValue).toStrictEqual(baseValueOld);
        expect(response.data.changes.new.baseValue.byFormula).toBe(baseValueOld.byFormula);
        expect(response.data.changes.new.baseValue.current).toBe(baseValueOld.current);
        expect(response.data.changes.new.baseValue.byLvlUp).toBe(baseValueOld.byLvlUp);
        // No byLvlUp for combat base values allowed
        expect(response.data.changes.new.baseValue.byLvlUp).toBeUndefined();

        if (body.start) {
          expect(response.data.changes.new.baseValue.start).toBe(body.start.newValue);
        }

        if (body.mod) {
          expect(response.data.changes.new.baseValue.mod).toBe(body.mod.newValue);
        }

        // Combat stats should be defined
        expect(response.data.changes.old.combat).toBeDefined();
        expect(response.data.changes.new.combat).toBeDefined();
        if (!response.data.changes.old.combat || !response.data.changes.new.combat) {
          throw new Error("Combat stats should be defined but are missing in the response");
        }

        // Check combat stats for melee skills
        const attackBaseValueKey: keyof BaseValues = "attackBaseValue";
        const paradeBaseValueKey: keyof BaseValues = "paradeBaseValue";
        const meleeCombatStatsChanged: boolean =
          _case.baseValueName === attackBaseValueKey || _case.baseValueName === paradeBaseValueKey;

        if (meleeCombatStatsChanged) {
          expect(response.data.changes.old.combat.melee).toBeDefined();
          expect(response.data.changes.new.combat.melee).toBeDefined();
          if (!response.data.changes.old.combat.melee || !response.data.changes.new.combat.melee) {
            throw new Error("Melee combat stats should be defined but are missing in the response");
          }

          expect(response.data.changes.old.combat.melee).toStrictEqual(character.characterSheet.combat.melee);

          for (const skillName of Object.keys(response.data.changes.old.combat.melee)) {
            const oldCombatStats =
              response.data.changes.old.combat.melee[skillName as keyof CharacterSheet["combat"]["melee"]];
            const newCombatStats =
              response.data.changes.new.combat.melee[skillName as keyof CharacterSheet["combat"]["melee"]];

            if (!oldCombatStats || !newCombatStats) {
              throw new Error(`Combat stats ${skillName} should be defined but are missing in the response`);
            }

            // Only attack and parade value must differ
            for (const key of Object.keys(oldCombatStats) as (keyof CombatStats)[]) {
              const attackValueKey: keyof CombatStats = "attackValue";
              const paradeValueKey: keyof CombatStats = "paradeValue";
              if (key === attackValueKey || key === paradeValueKey) continue;
              expect(newCombatStats[key]).toStrictEqual(oldCombatStats[key]);
            }

            // Check the difference between old and new values
            const diffAttackValue = newCombatStats.attackValue - oldCombatStats.attackValue;
            let diffAttackBaseValue = 0;
            if (_case.baseValueName === attackBaseValueKey) {
              diffAttackBaseValue =
                response.data.changes.new.baseValue.current -
                response.data.changes.old.baseValue.current +
                response.data.changes.new.baseValue.mod -
                response.data.changes.old.baseValue.mod;
            }
            expect(diffAttackValue).toBe(diffAttackBaseValue);

            const diffParadeValue = newCombatStats.paradeValue - oldCombatStats.paradeValue;
            let diffParadeBaseValue = 0;
            if (_case.baseValueName === paradeBaseValueKey) {
              diffParadeBaseValue =
                response.data.changes.new.baseValue.current -
                response.data.changes.old.baseValue.current +
                response.data.changes.new.baseValue.mod -
                response.data.changes.old.baseValue.mod;
            }
            expect(diffParadeValue).toBe(diffParadeBaseValue);
          }
        }

        // Check combat stats for ranged skills
        const rangedAttackBaseValueKey: keyof BaseValues = "rangedAttackBaseValue";
        const rangedCombatStatsChanged: boolean = _case.baseValueName === rangedAttackBaseValueKey;

        if (rangedCombatStatsChanged) {
          expect(response.data.changes.old.combat.ranged).toBeDefined();
          expect(response.data.changes.new.combat.ranged).toBeDefined();
          if (!response.data.changes.old.combat.ranged || !response.data.changes.new.combat.ranged) {
            throw new Error("Ranged combat stats should be defined but are missing in the response");
          }

          expect(response.data.changes.old.combat.ranged).toStrictEqual(character.characterSheet.combat.ranged);

          for (const skillName of Object.keys(response.data.changes.old.combat.ranged)) {
            const oldCombatStats =
              response.data.changes.old.combat.ranged[skillName as keyof CharacterSheet["combat"]["ranged"]];
            const newCombatStats =
              response.data.changes.new.combat.ranged[skillName as keyof CharacterSheet["combat"]["ranged"]];

            if (!oldCombatStats || !newCombatStats) {
              throw new Error(`Combat stats ${skillName} should be defined but are missing in the response`);
            }

            // Only attack value must differ
            for (const key of Object.keys(oldCombatStats) as (keyof CombatStats)[]) {
              const attackValueKey: keyof CombatStats = "attackValue";
              if (key === attackValueKey) continue;
              expect(newCombatStats[key]).toStrictEqual(oldCombatStats[key]);
            }

            // Check the difference between old and new values
            const diffAttackValue = newCombatStats.attackValue - oldCombatStats.attackValue;
            const diffRangedAttackBaseValue =
              response.data.changes.new.baseValue.current -
              response.data.changes.old.baseValue.current +
              response.data.changes.new.baseValue.mod -
              response.data.changes.old.baseValue.mod;
            expect(diffAttackValue).toBe(diffRangedAttackBaseValue);

            expect(newCombatStats.paradeValue).toBe(0); // No parade for ranged skills
          }
        }

        if (!meleeCombatStatsChanged && !rangedCombatStatsChanged) {
          throw new Error("No combat stats changed");
        }

        // Verify history record was created
        expect(response.historyRecord).not.toBeNull();

        const historyRecord = response.historyRecord as PatchBaseValueHistoryRecord;

        // Verify basic record properties
        expect(historyRecord.type).toBe(HistoryRecordType.BASE_VALUE_CHANGED);
        expect(historyRecord.name).toBe(_case.baseValueName);
        expect(historyRecord.number).toBeGreaterThan(0);
        expect(historyRecord.id).toBeDefined();
        expect(historyRecord.timestamp).toBeDefined();

        // Verify record data matches response changes
        expect(historyRecord.data.old).toStrictEqual(response.data.changes.old);
        expect(historyRecord.data.new).toStrictEqual(response.data.changes.new);

        expect(historyRecord.calculationPoints.attributePoints).toBeNull();
        expect(historyRecord.calculationPoints.adventurePoints).toBeNull();

        expect(historyRecord.data.old.baseValue).toBeDefined();
        expect(historyRecord.data.new.baseValue).toBeDefined();

        expect(historyRecord.data.old.combat).toBeDefined();
        expect(historyRecord.data.new.combat).toBeDefined();

        expect(historyRecord.comment).toBeNull();
      });
    });
  });
});
