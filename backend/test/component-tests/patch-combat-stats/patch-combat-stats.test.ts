import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  patchCombatStatsResponseSchema,
  Character,
  CombatStats,
  HistoryRecordType,
  PatchCombatStatsHistoryRecord,
  PatchCombatStatsResponse,
  HistoryRecord,
} from "api-spec";
import { expectApiError, commonInvalidTestCases, updateAndVerifyTestContextAfterEachTest } from "../shared.js";
import { ApiClient } from "../api-client.js";
import { TestContext, TestContextFactory } from "../test-context-factory.js";

describe.sequential("patch-combat-stats component tests", () => {
  let context: TestContext;
  let currentResponse: PatchCombatStatsResponse | undefined;

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
      (response: PatchCombatStatsResponse, character: Character) => {
        const combatCategory = response.data.combatCategory as keyof typeof character.characterSheet.combat;
        const combatSkillName = response.data.combatSkillName;
        (character.characterSheet.combat[combatCategory] as any)[combatSkillName] = response.data.combatStats.new;
      },
      (response: PatchCombatStatsResponse, record: HistoryRecord) => {
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
        const stats = character.characterSheet.combat.melee.thrustingWeapons1h;

        const authorizationHeader = _case.authorizationHeader ?? context.authorizationHeader;
        const path = _case.characterId
          ? `characters/${_case.characterId}/combat/melee/thrustingWeapons1h`
          : `characters/${character.characterId}/combat/melee/thrustingWeapons1h`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(
          () =>
            client.patch(path, {
              skilledAttackValue: {
                initialValue: stats.skilledAttackValue,
                increasedPoints: 1,
              },
              skilledParadeValue: {
                initialValue: stats.skilledParadeValue,
                increasedPoints: 1,
              },
            }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    test("no parade value allowed for ranged combat skills", async () => {
      const character = context.character;
      const stats = character.characterSheet.combat.ranged.firearmMedium;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/combat/ranged/firearmMedium`, {
            skilledAttackValue: {
              initialValue: stats.skilledAttackValue,
              increasedPoints: 0,
            },
            skilledParadeValue: {
              initialValue: stats.skilledParadeValue,
              increasedPoints: 1,
            },
          }),
        400,
        "Parade value for a ranged combat skill must be 0",
      );
    });

    test("passed initial skill values do not match backend", async () => {
      const character = context.character;
      const stats = character.characterSheet.combat.melee.thrustingWeapons1h;

      const error = await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/combat/melee/thrustingWeapons1h`, {
            skilledAttackValue: {
              initialValue: stats.skilledAttackValue + 5,
              increasedPoints: 1,
            },
            skilledParadeValue: {
              initialValue: stats.skilledParadeValue + 5,
              increasedPoints: 1,
            },
          }),
        409,
        "don't match",
      );
    });

    test("not enough points to increase combat stats", async () => {
      const character = context.character;
      const stats = character.characterSheet.combat.melee.thrustingWeapons1h;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/combat/melee/thrustingWeapons1h`, {
            skilledAttackValue: {
              initialValue: stats.skilledAttackValue,
              increasedPoints: 100,
            },
            skilledParadeValue: {
              initialValue: stats.skilledParadeValue,
              increasedPoints: 100,
            },
          }),
        400,
        "Not enough points",
      );
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
        name: "melee combat stats already updated to target value (idempotency)",
        combatCategory: "melee" as const,
        combatSkillName: "thrustingWeapons1h",
        getBody: (character: Character) => ({
          skilledAttackValue: {
            initialValue: character.characterSheet.combat.melee.thrustingWeapons1h.skilledAttackValue - 3,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: character.characterSheet.combat.melee.thrustingWeapons1h.skilledParadeValue - 2,
            increasedPoints: 2,
          },
        }),
      },
      {
        name: "ranged combat stats already updated to target value (idempotency)",
        combatCategory: "ranged" as const,
        combatSkillName: "firearmSimple",
        getBody: (character: Character) => ({
          skilledAttackValue: {
            initialValue: character.characterSheet.combat.ranged.firearmSimple.skilledAttackValue - 3,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: character.characterSheet.combat.ranged.firearmSimple.skilledParadeValue,
            increasedPoints: 0,
          },
        }),
      },
    ];

    idempotentTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const body = _case.getBody(character);

        const response = patchCombatStatsResponseSchema.parse(
          await context.apiClient.patch(
            `characters/${character.characterId}/combat/${_case.combatCategory}/${_case.combatSkillName}`,
            body,
          ),
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
        expect(response.data.combatCategory).toBe(_case.combatCategory);
        expect(response.data.combatSkillName).toBe(_case.combatSkillName);

        // Verify idempotency - no history record
        expect(response.historyRecord).toBeNull();

        // Verify combat stats remain unchanged
        const oldCombatStats = (character.characterSheet.combat[_case.combatCategory] as any)[
          _case.combatSkillName
        ] as CombatStats;
        expect(response.data.combatStats.old).toStrictEqual(oldCombatStats);
        expect(response.data.combatStats.new).toStrictEqual(oldCombatStats);

        // Verify calculated values match expectations
        expect(response.data.combatStats.new.skilledAttackValue).toBe(
          body.skilledAttackValue.initialValue + body.skilledAttackValue.increasedPoints,
        );
        expect(response.data.combatStats.new.skilledParadeValue).toBe(
          body.skilledParadeValue.initialValue + body.skilledParadeValue.increasedPoints,
        );

        // For ranged combat, parade values should be 0
        if (_case.combatCategory === "ranged") {
          expect(response.data.combatStats.new.skilledParadeValue).toBe(0);
          expect(response.data.combatStats.new.paradeValue).toBe(0);
        }
      });
    });
  });

  /**
   * =============================
   * Patch combat stats
   * =============================
   */

  describe("Patch combat stats", () => {
    const updateTestCases = [
      {
        name: "increase attack value (melee combat skill)",
        combatCategory: "melee" as const,
        combatSkillName: "thrustingWeapons1h",
        getBody: (character: Character) => ({
          skilledAttackValue: {
            initialValue: character.characterSheet.combat.melee.thrustingWeapons1h.skilledAttackValue,
            increasedPoints: 5,
          },
          skilledParadeValue: {
            initialValue: character.characterSheet.combat.melee.thrustingWeapons1h.skilledParadeValue,
            increasedPoints: 0,
          },
        }),
        expectedCosts: 5,
      },
      {
        name: "increase parade value (melee combat skill)",
        combatCategory: "melee" as const,
        combatSkillName: "thrustingWeapons1h",
        getBody: (character: Character) => ({
          skilledAttackValue: {
            initialValue: character.characterSheet.combat.melee.thrustingWeapons1h.skilledAttackValue,
            increasedPoints: 0,
          },
          skilledParadeValue: {
            initialValue: character.characterSheet.combat.melee.thrustingWeapons1h.skilledParadeValue,
            increasedPoints: 4,
          },
        }),
        expectedCosts: 4,
      },
      {
        name: "increase all combat stats (melee combat skill)",
        combatCategory: "melee" as const,
        combatSkillName: "thrustingWeapons1h",
        getBody: (character: Character) => ({
          skilledAttackValue: {
            initialValue: character.characterSheet.combat.melee.thrustingWeapons1h.skilledAttackValue,
            increasedPoints: 5,
          },
          skilledParadeValue: {
            initialValue: character.characterSheet.combat.melee.thrustingWeapons1h.skilledParadeValue,
            increasedPoints: 5,
          },
        }),
        expectedCosts: 10,
      },
      {
        name: "increase attack value (ranged combat skill)",
        combatCategory: "ranged" as const,
        combatSkillName: "firearmMedium",
        getBody: (character: Character) => ({
          skilledAttackValue: {
            initialValue: character.characterSheet.combat.ranged.firearmMedium.skilledAttackValue,
            increasedPoints: 10,
          },
          skilledParadeValue: {
            initialValue: character.characterSheet.combat.ranged.firearmMedium.skilledParadeValue,
            increasedPoints: 0,
          },
        }),
        expectedCosts: 10,
      },
    ];

    updateTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const body = _case.getBody(character);

        const response = patchCombatStatsResponseSchema.parse(
          await context.apiClient.patch(
            `characters/${character.characterId}/combat/${_case.combatCategory}/${_case.combatSkillName}`,
            body,
          ),
        );
        currentResponse = response;

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.combatCategory).toBe(_case.combatCategory);
        expect(response.data.combatSkillName).toBe(_case.combatSkillName);

        // Verify combat stats updates
        const oldCombatStats = (character.characterSheet.combat[_case.combatCategory] as any)[
          _case.combatSkillName
        ] as CombatStats;
        expect(response.data.combatStats.old).toStrictEqual(oldCombatStats);

        // Verify skilled values were increased correctly
        expect(response.data.combatStats.new.skilledAttackValue).toBe(
          body.skilledAttackValue.initialValue + body.skilledAttackValue.increasedPoints,
        );
        expect(response.data.combatStats.new.skilledParadeValue).toBe(
          body.skilledParadeValue.initialValue + body.skilledParadeValue.increasedPoints,
        );

        // Verify total attack and parade values include base values
        if (_case.combatCategory === "ranged") {
          const rangedAttackBaseValue =
            character.characterSheet.baseValues.rangedAttackBaseValue.current +
            character.characterSheet.baseValues.rangedAttackBaseValue.mod;
          expect(response.data.combatStats.new.attackValue).toBe(
            response.data.combatStats.new.skilledAttackValue + rangedAttackBaseValue,
          );
          expect(response.data.combatStats.new.skilledParadeValue).toBe(0);
          expect(response.data.combatStats.new.paradeValue).toBe(0);
        } else {
          const attackBaseValue =
            character.characterSheet.baseValues.attackBaseValue.current +
            character.characterSheet.baseValues.attackBaseValue.mod;
          expect(response.data.combatStats.new.attackValue).toBe(
            response.data.combatStats.new.skilledAttackValue + attackBaseValue,
          );
          const paradeBaseValue =
            character.characterSheet.baseValues.paradeBaseValue.current +
            character.characterSheet.baseValues.paradeBaseValue.mod;
          expect(response.data.combatStats.new.paradeValue).toBe(
            response.data.combatStats.new.skilledParadeValue + paradeBaseValue,
          );
        }

        // Verify points were spent correctly
        const oldAvailablePoints = oldCombatStats.availablePoints;
        const diffAvailablePoints = oldAvailablePoints - response.data.combatStats.new.availablePoints;
        expect(diffAvailablePoints).toBe(_case.expectedCosts);
        const diffCombatStats =
          response.data.combatStats.new.attackValue -
          oldCombatStats.attackValue +
          (response.data.combatStats.new.paradeValue - oldCombatStats.paradeValue);
        expect(diffAvailablePoints).toBe(diffCombatStats);

        // Verify handling remains unchanged
        expect(response.data.combatStats.new.handling).toBe(oldCombatStats.handling);

        // Verify history record was created
        expect(response.historyRecord).not.toBeNull();

        const historyRecord = response.historyRecord as PatchCombatStatsHistoryRecord;

        // Verify basic record properties
        expect(historyRecord.type).toBe(HistoryRecordType.COMBAT_STATS_CHANGED);
        expect(historyRecord.name).toBe(`${_case.combatCategory}/${_case.combatSkillName}`);
        expect(historyRecord.number).toBeGreaterThan(0);
        expect(historyRecord.id).toBeDefined();
        expect(historyRecord.timestamp).toBeDefined();
        expect(historyRecord.learningMethod).toBeNull();

        // Verify record data matches response changes
        expect(historyRecord.data.old).toStrictEqual(response.data.combatStats.old);
        expect(historyRecord.data.new).toStrictEqual(response.data.combatStats.new);

        // Verify calculation points changes
        expect(historyRecord.calculationPoints.adventurePoints).toBeNull();
        expect(historyRecord.calculationPoints.attributePoints).toBeNull();

        // Verify comment is null (not set in this operation)
        expect(historyRecord.comment).toBeNull();
      });
    });
  });
});
