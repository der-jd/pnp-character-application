import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  patchAttributeResponseSchema,
  CharacterSheet,
  Character,
  Attribute,
  BaseValue,
  BaseValues,
  CombatStats,
  HistoryRecordType,
  PatchAttributeHistoryRecord,
  PatchAttributeResponse,
} from "api-spec";
import { expectApiError, verifyCharacterState, verifyLatestHistoryRecord, commonInvalidTestCases } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext, setTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

function updateTestContextCharacter(
  character: Character,
  response: PatchAttributeResponse,
): void {
  character.characterSheet.attributes[response.data.attributeName as keyof CharacterSheet["attributes"]] =
    response.data.changes.new.attribute;
  character.characterSheet.calculationPoints.attributePoints = response.data.attributePoints.new;

  // Update base values if they changed
  if (response.data.changes.new.baseValues) {
    for (const [baseValueName, baseValue] of Object.entries(response.data.changes.new.baseValues)) {
      character.characterSheet.baseValues[baseValueName as keyof BaseValues] = baseValue as BaseValue;
    }
  }

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

  setTestContext({
    character,
    lastHistoryRecord: response.historyRecord!,
  });
}

describe.sequential("patch-attribute component tests", () => {
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
          ? `characters/${_case.characterId}/attributes/endurance`
          : `characters/${character.characterId}/attributes/endurance`;
        const client = new ApiClient(getTestContext().apiBaseUrl, authorizationHeader);

        await expectApiError(
          () =>
            client.patch(path, {
              current: {
                initialValue: 18,
                increasedPoints: 1,
              },
            }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    test("passed initial start attribute value doesn't match the value in the backend", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/attributes/endurance`, {
            start: {
              initialValue: 6,
              newValue: 7,
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial current attribute value doesn't match the value in the backend", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/attributes/endurance`, {
            current: {
              initialValue: 6,
              increasedPoints: 1,
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial mod attribute value doesn't match the value in the backend", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/attributes/endurance`, {
            mod: {
              initialValue: 1,
              newValue: 3,
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("not enough attribute points", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/attributes/endurance`, {
            current: {
              initialValue: 5,
              increasedPoints: 60,
            },
          }),
        400,
        "Not enough attribute points",
      );
    });

    test("increased points are 0", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/attributes/endurance`, {
            current: {
              initialValue: 5,
              increasedPoints: 0,
            },
          }),
        400,
        "Invalid input values!",
      );
    });

    test("increased points are negative", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/attributes/endurance`, {
            current: {
              initialValue: 5,
              increasedPoints: -1,
            },
          }),
        400,
        "Invalid input values!",
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
        name: "attribute has already been updated to the target start value (idempotency)",
        attributeName: "endurance",
        body: {
          start: {
            initialValue: 3,
            newValue: 5,
          },
        },
      },
      {
        name: "attribute has already been increased to the target current value (idempotency)",
        attributeName: "endurance",
        body: {
          current: {
            initialValue: 2,
            increasedPoints: 3,
          },
        },
      },
      {
        name: "attribute has already been updated to the target mod value (idempotency)",
        attributeName: "endurance",
        body: {
          mod: {
            initialValue: 2,
            newValue: 0,
          },
        },
      },
    ];

    idempotentTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = getTestContext().character;

        const response = patchAttributeResponseSchema.parse(
          await apiClient.patch(`characters/${character.characterId}/attributes/${_case.attributeName}`, _case.body),
        );

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.attributeName).toBe(_case.attributeName);

        // Verify idempotency - no history record
        expect(response.historyRecord).toBeNull();

        // Verify attribute value updates
        if (_case.body.start) {
          expect(response.data.changes.new.attribute.start).toBe(_case.body.start.newValue);
        }

        if (_case.body.current) {
          const expectedCurrent = _case.body.current.initialValue + _case.body.current.increasedPoints;
          expect(response.data.changes.new.attribute.current).toBe(expectedCurrent);
        }

        if (_case.body.mod) {
          expect(response.data.changes.new.attribute.mod).toBe(_case.body.mod.newValue);
        }

        expect(response.data.changes.old.attribute).toStrictEqual(
          character.characterSheet.attributes[_case.attributeName as keyof CharacterSheet["attributes"]],
        );
        expect(response.data.changes.new.attribute).toStrictEqual(response.data.changes.old.attribute);

        // Verify no attribute points were spent
        const oldAttributePoints = character.characterSheet.calculationPoints.attributePoints;
        const oldAvailableAttributePoints = oldAttributePoints.available;
        const diffAvailableAttributePoints = oldAvailableAttributePoints - response.data.attributePoints.new.available;
        expect(diffAvailableAttributePoints).toBe(0);
        expect(response.data.attributePoints.old).toStrictEqual(oldAttributePoints);
        expect(response.data.attributePoints.new).toStrictEqual(oldAttributePoints);

        // Verify no attribute cost changes
        const oldTotalAttributeCost = response.data.changes.old.attribute.totalCost;
        const diffAttributeTotalCost = response.data.changes.new.attribute.totalCost - oldTotalAttributeCost;
        expect(diffAvailableAttributePoints).toBe(diffAttributeTotalCost);

        // Verify no base values or combat stats changes
        expect(response.data.changes.old.baseValues).toBeUndefined();
        expect(response.data.changes.new.baseValues).toBeUndefined();
        expect(response.data.changes.old.combat).toBeUndefined();
        expect(response.data.changes.new.combat).toBeUndefined();

        // Character from the backend should be still identical to the one before the update
        await verifyCharacterState(character.characterId, getTestContext().character);

        // Latest history record should be the same as the one before the update
        await verifyLatestHistoryRecord(character.characterId, getTestContext().lastHistoryRecord);
      });
    });
  });

  /**
   * =============================
   * Patch attribute
   * =============================
   */

  describe("Patch attribute", () => {
    const updateTestCases = [
      {
        name: "update start attribute value",
        attributeName: "endurance",
        body: {
          start: {
            initialValue: 5,
            newValue: 6,
          },
        },
        expectedCosts: 0,
      },
      {
        name: "increase current attribute value by 1 point",
        attributeName: "endurance",
        body: {
          current: {
            initialValue: 5,
            increasedPoints: 1,
          },
        },
        expectedCosts: 1,
      },
      {
        name: "increase current attribute value by 3 points",
        attributeName: "endurance",
        body: {
          current: {
            initialValue: 6,
            increasedPoints: 3,
          },
        },
        expectedCosts: 3,
      },
      {
        name: "update mod value",
        attributeName: "endurance",
        body: {
          mod: {
            initialValue: 0,
            newValue: 2,
          },
        },
        expectedCosts: 0,
      },
      {
        name: "update all attribute values (start, current, mod)",
        attributeName: "endurance",
        body: {
          start: {
            initialValue: 6,
            newValue: 3,
          },
          current: {
            initialValue: 9,
            increasedPoints: 1,
          },
          mod: {
            initialValue: 2,
            newValue: 3,
          },
        },
        expectedCosts: 1,
      },
    ];

    updateTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = getTestContext().character;

        const response = patchAttributeResponseSchema.parse(
          await apiClient.patch(`characters/${character.characterId}/attributes/${_case.attributeName}`, _case.body),
        );

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.attributeName).toBe(_case.attributeName);

        // Verify attribute value updates
        if (_case.body.start) {
          expect(response.data.changes.new.attribute.start).toBe(_case.body.start.newValue);
        }

        if (_case.body.current) {
          const expectedCurrent = _case.body.current.initialValue + _case.body.current.increasedPoints;
          expect(response.data.changes.new.attribute.current).toBe(expectedCurrent);
        }

        if (_case.body.mod) {
          expect(response.data.changes.new.attribute.mod).toBe(_case.body.mod.newValue);
        }

        // Verify attribute points were spent correctly
        const oldAttributePoints = character.characterSheet.calculationPoints.attributePoints;
        const oldAvailableAttributePoints = oldAttributePoints.available;
        const diffAvailableAttributePoints = oldAvailableAttributePoints - response.data.attributePoints.new.available;
        expect(diffAvailableAttributePoints).toBe(_case.expectedCosts);
        expect(diffAvailableAttributePoints).toBe(
          response.data.attributePoints.old.available - response.data.attributePoints.new.available,
        );
        expect(response.data.attributePoints.old).toStrictEqual(oldAttributePoints);
        expect(response.data.attributePoints.new).toStrictEqual({
          ...oldAttributePoints,
          available: oldAvailableAttributePoints - diffAvailableAttributePoints,
        });

        // Verify attribute cost changes
        const attributeOld = character.characterSheet.attributes[
          _case.attributeName as keyof CharacterSheet["attributes"]
        ] as Attribute;
        const oldTotalAttributeCost = attributeOld.totalCost;
        const diffAttributeTotalCost = response.data.changes.new.attribute.totalCost - oldTotalAttributeCost;
        expect(diffAvailableAttributePoints).toBe(diffAttributeTotalCost);

        expect(response.data.changes.old.attribute).toStrictEqual(attributeOld);

        // Verify history record was created
        expect(response.historyRecord).not.toBeNull();

        const historyRecord = response.historyRecord as PatchAttributeHistoryRecord;

        // Verify basic record properties
        expect(historyRecord.type).toBe(HistoryRecordType.ATTRIBUTE_CHANGED);
        expect(historyRecord.name).toBe(_case.attributeName);
        expect(historyRecord.number).toBeGreaterThan(0);
        expect(historyRecord.id).toBeDefined();
        expect(historyRecord.timestamp).toBeDefined();

        // Verify record data matches response changes
        expect(historyRecord.data.old).toStrictEqual(response.data.changes.old);
        expect(historyRecord.data.new).toStrictEqual(response.data.changes.new);

        // Verify calculation points changes
        expect(historyRecord.calculationPoints.attributePoints).toBeDefined();
        expect(historyRecord.calculationPoints.attributePoints!.old).toStrictEqual(response.data.attributePoints.old);
        expect(historyRecord.calculationPoints.attributePoints!.new).toStrictEqual(response.data.attributePoints.new);
        expect(historyRecord.calculationPoints.adventurePoints).toBeNull();

        // Verify comment is null (not set in this operation)
        expect(historyRecord.comment).toBeNull();

        updateTestContextCharacter(character, response);

        await verifyCharacterState(character.characterId, getTestContext().character);

        await verifyLatestHistoryRecord(character.characterId, getTestContext().lastHistoryRecord);
      });
    });
  });

  /**
   * =============================
   * Base values changes
   * =============================
   */

  describe("Base values changes", () => {
    const baseValuesTestCases = [
      {
        name: "update start value of attribute 'strength' -> unchanged base values",
        attributeName: "strength",
        attributeEffects: {},
        body: {
          start: {
            initialValue: 6,
            newValue: 7,
          },
        },
      },
      {
        name: "increase current value of attribute 'intelligence' -> unchanged base values",
        attributeName: "intelligence",
        attributeEffects: {},
        body: {
          current: {
            initialValue: 4,
            increasedPoints: 1,
          },
        },
      },
      {
        name: "update current value of attribute 'charisma' -> unchanged base values",
        attributeName: "charisma",
        attributeEffects: {},
        body: {
          current: {
            initialValue: 5,
            increasedPoints: 1,
          },
        },
      },
      {
        name: "update current value of attribute 'mental resilience' -> changed base values",
        attributeName: "mentalResilience",
        attributeEffects: {
          mentalHealth: 10,
        },
        body: {
          current: {
            initialValue: 6,
            increasedPoints: 5,
          },
        },
      },
      {
        name: "update mod value of attribute 'mental resilience' -> changed base values",
        attributeName: "mentalResilience",
        attributeEffects: {
          mentalHealth: 10,
        },
        body: {
          mod: {
            initialValue: 0,
            newValue: 5,
          },
        },
      },
      {
        name: "update current and mod value of attribute 'endurance' -> changed base values",
        attributeName: "endurance",
        attributeEffects: {
          healthPoints: 10,
          initiativeBaseValue: 1,
          paradeBaseValue: 10,
        },
        body: {
          current: {
            initialValue: 10,
            increasedPoints: 3,
          },
          mod: {
            initialValue: 3,
            newValue: 5,
          },
        },
      },
      {
        name: "update current value of attribute 'dexterity' -> changed base values",
        attributeName: "dexterity",
        attributeEffects: {
          initiativeBaseValue: 1,
          attackBaseValue: 10,
          paradeBaseValue: 10,
          rangedAttackBaseValue: 10,
        },
        body: {
          current: {
            initialValue: 5,
            increasedPoints: 5,
          },
        },
      },
      {
        name: "update current value of attribute 'concentration' -> changed base values",
        attributeName: "concentration",
        attributeEffects: {
          rangedAttackBaseValue: 2,
        },
        body: {
          current: {
            initialValue: 4,
            increasedPoints: 1,
          },
        },
      },
      {
        name: "update current value of attribute 'courage' -> changed base values",
        attributeName: "courage",
        attributeEffects: {
          mentalHealth: 3,
          initiativeBaseValue: 1,
          attackBaseValue: 6,
        },
        body: {
          current: {
            initialValue: 7,
            increasedPoints: 3,
          },
        },
      },
      {
        name: "update current value of attribute 'strength' -> changed base values",
        attributeName: "strength",
        attributeEffects: {
          healthPoints: 1,
          attackBaseValue: 2,
          paradeBaseValue: 2,
          rangedAttackBaseValue: 2,
        },
        body: {
          current: {
            initialValue: 6,
            increasedPoints: 1,
          },
        },
      },
    ];

    baseValuesTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = getTestContext().character;

        const response = patchAttributeResponseSchema.parse(
          await apiClient.patch(`characters/${character.characterId}/attributes/${_case.attributeName}`, _case.body),
        );

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.attributeName).toBe(_case.attributeName);

        // Verify base values changes
        if (Object.keys(_case.attributeEffects).length > 0) {
          expect(response.data.changes.old.baseValues).toBeDefined();
          expect(response.data.changes.new.baseValues).toBeDefined();

          if (!response.data.changes.old.baseValues || !response.data.changes.new.baseValues) {
            throw new Error("Base values should be defined but are missing in the response");
          }

          // These base values should never be changed by attributes according to the formulas
          const armorLevel: keyof BaseValues = "armorLevel";
          const naturalArmor: keyof BaseValues = "naturalArmor";
          const luckPoints: keyof BaseValues = "luckPoints";
          const bonusActionsPerCombatRound: keyof BaseValues = "bonusActionsPerCombatRound";
          const legendaryActions: keyof BaseValues = "legendaryActions";

          expect(response.data.changes.old.baseValues[armorLevel]).toBeUndefined();
          expect(response.data.changes.old.baseValues[naturalArmor]).toBeUndefined();
          expect(response.data.changes.old.baseValues[luckPoints]).toBeUndefined();
          expect(response.data.changes.old.baseValues[bonusActionsPerCombatRound]).toBeUndefined();
          expect(response.data.changes.old.baseValues[legendaryActions]).toBeUndefined();

          expect(response.data.changes.new.baseValues[armorLevel]).toBeUndefined();
          expect(response.data.changes.new.baseValues[naturalArmor]).toBeUndefined();
          expect(response.data.changes.new.baseValues[luckPoints]).toBeUndefined();
          expect(response.data.changes.new.baseValues[bonusActionsPerCombatRound]).toBeUndefined();
          expect(response.data.changes.new.baseValues[legendaryActions]).toBeUndefined();

          // Ensure all base values defined in the attribute effect map are present in the response
          const attributeEffects = _case.attributeEffects;
          for (const baseValueName of Object.keys(attributeEffects) as (keyof BaseValues)[]) {
            expect(response.data.changes.old.baseValues[baseValueName]).toBeDefined();
            expect(response.data.changes.new.baseValues[baseValueName]).toBeDefined();
          }

          // Parsed body contains only changed base values
          for (const baseValueName of Object.keys(response.data.changes.old.baseValues) as (keyof BaseValues)[]) {
            const oldVal = response.data.changes.old.baseValues[baseValueName];
            const newVal = response.data.changes.new.baseValues[baseValueName];

            expect(oldVal).toBeDefined();
            expect(newVal).toBeDefined();
            if (!oldVal || !newVal || !oldVal.byFormula || !newVal.byFormula) {
              throw new Error(`Base value ${baseValueName}.byFormula should be defined but is missing in the response`);
            }

            // Check if the old value is the same as in the stored character
            expect(oldVal).toStrictEqual(character.characterSheet.baseValues[baseValueName]);

            // Only byFormula and current value should differ
            for (const key of Object.keys(oldVal) as (keyof BaseValue)[]) {
              if (key === "byFormula" || key === "current") continue;
              expect(newVal[key]).toStrictEqual(oldVal[key]);
            }

            // Check the difference between old and new values
            const diffCurrent = newVal.current - oldVal.current;
            const diffByFormula = newVal.byFormula - oldVal.byFormula;
            expect(diffCurrent).toBe(diffByFormula);

            // Check the effect of the attribute on the base values
            const expectedEffect = (attributeEffects as any)[baseValueName];
            expect(newVal.current).toBe(oldVal.current + (expectedEffect ?? 0));
            expect(newVal.byFormula).toBe(oldVal.byFormula + (expectedEffect ?? 0));
          }
        } else {
          // Only attribute is updated
          expect(response.data.changes.old.baseValues).toBeUndefined();
          expect(response.data.changes.new.baseValues).toBeUndefined();
          expect(response.data.changes.old.combat).toBeUndefined();
          expect(response.data.changes.new.combat).toBeUndefined();
        }

        // Verify history record was created
        expect(response.historyRecord).not.toBeNull();

        const historyRecord = response.historyRecord as PatchAttributeHistoryRecord;

        // Verify base values changes
        expect(historyRecord.data.old.baseValues).toBeDefined();
        expect(historyRecord.data.new.baseValues).toBeDefined();
        expect(historyRecord.data.old.baseValues).toStrictEqual(response.data.changes.old.baseValues);
        expect(historyRecord.data.new.baseValues).toStrictEqual(response.data.changes.new.baseValues);

        updateTestContextCharacter(character, response);

        await verifyCharacterState(character.characterId, getTestContext().character);
        await verifyLatestHistoryRecord(character.characterId, getTestContext().lastHistoryRecord);
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
        name: "update current and mod value of attribute 'endurance' -> changed combat stats",
        attributeName: "endurance",
        body: {
          current: {
            initialValue: 13,
            increasedPoints: 3,
          },
          mod: {
            initialValue: 5,
            newValue: 7,
          },
        },
      },
      {
        name: "update current value of attribute 'dexterity' -> changed combat stats",
        attributeName: "dexterity",
        body: {
          current: {
            initialValue: 10,
            increasedPoints: 5,
          },
        },
      },
      {
        name: "update current value of attribute 'concentration' -> changed combat stats",
        attributeName: "concentration",
        body: {
          current: {
            initialValue: 5,
            increasedPoints: 1,
          },
        },
      },
      {
        name: "update current value of attribute 'courage' -> changed combat stats",
        attributeName: "courage",
        body: {
          current: {
            initialValue: 10,
            increasedPoints: 3,
          },
        },
      },
      {
        name: "update current value of attribute 'strength' -> changed combat stats",
        attributeName: "strength",
        body: {
          current: {
            initialValue: 7,
            increasedPoints: 1,
          },
        },
      },
    ];

    combatStatsTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = getTestContext().character;

        const response = patchAttributeResponseSchema.parse(
          await apiClient.patch(`characters/${character.characterId}/attributes/${_case.attributeName}`, _case.body),
        );

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.attributeName).toBe(_case.attributeName);

        // Base values should be defined
        expect(response.data.changes.old.baseValues).toBeDefined();
        expect(response.data.changes.new.baseValues).toBeDefined();
        if (!response.data.changes.old.baseValues || !response.data.changes.new.baseValues) {
          throw new Error("Base values should be defined but are missing in the response");
        }

        // Combat stats should be defined
        expect(response.data.changes.old.combat).toBeDefined();
        expect(response.data.changes.new.combat).toBeDefined();
        if (!response.data.changes.old.combat || !response.data.changes.new.combat) {
          throw new Error("Combat stats should be defined but are missing in the response");
        }

        // Verify combat stats for melee skills
        const meleeCombatStatsChanged: boolean =
          response.data.changes.new.baseValues.attackBaseValue !== undefined ||
          response.data.changes.new.baseValues.paradeBaseValue !== undefined;
        if (meleeCombatStatsChanged) {
          expect(
            (response.data.changes.old.baseValues.attackBaseValue &&
              response.data.changes.new.baseValues.attackBaseValue) ||
              (response.data.changes.old.baseValues.paradeBaseValue &&
                response.data.changes.new.baseValues.paradeBaseValue),
          ).toBeTruthy();
          if (
            !response.data.changes.old.baseValues.attackBaseValue &&
            !response.data.changes.new.baseValues.attackBaseValue &&
            !response.data.changes.old.baseValues.paradeBaseValue &&
            !response.data.changes.new.baseValues.paradeBaseValue
          ) {
            throw new Error("Attack base value or parade base value should be defined but are missing in the response");
          }

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

            // Only attack and parade value must differ, and they should reflect the attribute changes
            for (const key of Object.keys(oldCombatStats) as (keyof CombatStats)[]) {
              const attackValueKey: keyof CombatStats = "attackValue";
              const paradeValueKey: keyof CombatStats = "paradeValue";

              if (key === attackValueKey || key === paradeValueKey) {
                // Verify the change matches the base value change
                const baseValueKey = key === "attackValue" ? "attackBaseValue" : "paradeBaseValue";
                const expectedChange =
                  (response.data.changes.new.baseValues![baseValueKey as keyof BaseValues]?.current || 0) -
                  (response.data.changes.old.baseValues![baseValueKey as keyof BaseValues]?.current || 0) +
                  (response.data.changes.new.baseValues![baseValueKey as keyof BaseValues]?.mod || 0) -
                  (response.data.changes.old.baseValues![baseValueKey as keyof BaseValues]?.mod || 0);
                const actualChange = newCombatStats[key] - oldCombatStats[key];
                expect(actualChange).toBe(expectedChange);

                // Only expect values to be different if there's an actual change
                if (expectedChange !== 0) {
                  expect(newCombatStats[key]).not.toStrictEqual(oldCombatStats[key]);
                }
              } else {
                // Other values should remain the same
                expect(newCombatStats[key]).toStrictEqual(oldCombatStats[key]);
              }
            }
          }
        }

        // Verify combat stats for ranged skills
        const rangedCombatStatsChanged: boolean =
          response.data.changes.new.baseValues.rangedAttackBaseValue !== undefined;
        if (rangedCombatStatsChanged) {
          expect(response.data.changes.old.baseValues.rangedAttackBaseValue).toBeDefined();
          expect(response.data.changes.new.baseValues.rangedAttackBaseValue).toBeDefined();
          if (
            !response.data.changes.old.baseValues.rangedAttackBaseValue ||
            !response.data.changes.new.baseValues.rangedAttackBaseValue
          ) {
            throw new Error("Ranged attack base value should be defined but is missing in the response");
          }

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

            // Only attack value must differ, and it should reflect the attribute changes
            for (const key of Object.keys(oldCombatStats) as (keyof CombatStats)[]) {
              const attackValueKey: keyof CombatStats = "attackValue";

              if (key === attackValueKey) {
                // Verify the change matches the base value change
                const expectedChange =
                  (response.data.changes.new.baseValues!.rangedAttackBaseValue?.current || 0) -
                  (response.data.changes.old.baseValues!.rangedAttackBaseValue?.current || 0) +
                  (response.data.changes.new.baseValues!.rangedAttackBaseValue?.mod || 0) -
                  (response.data.changes.old.baseValues!.rangedAttackBaseValue?.mod || 0);
                const actualChange = newCombatStats[key] - oldCombatStats[key];
                expect(actualChange).toBe(expectedChange);

                // Only expect values to be different if there's an actual change
                if (expectedChange !== 0) {
                  expect(newCombatStats[key]).not.toStrictEqual(oldCombatStats[key]);
                }
              } else {
                // Other values should remain the same
                expect(newCombatStats[key]).toStrictEqual(oldCombatStats[key]);
              }
            }

            expect(newCombatStats.paradeValue).toBe(0); // No parade for ranged skills
          }
        }

        if (!meleeCombatStatsChanged && !rangedCombatStatsChanged) {
          throw new Error("No combat stats changed");
        }

        // Verify history record was created
        expect(response.historyRecord).not.toBeNull();

        const historyRecord = response.historyRecord as PatchAttributeHistoryRecord;

        // Verify base values changes
        expect(historyRecord.data.old.combat).toBeDefined();
        expect(historyRecord.data.new.combat).toBeDefined();
        expect(historyRecord.data.old.combat).toStrictEqual(response.data.changes.old.combat);
        expect(historyRecord.data.new.combat).toStrictEqual(response.data.changes.new.combat);

        updateTestContextCharacter(character, response);

        await verifyCharacterState(character.characterId, getTestContext().character);
        await verifyLatestHistoryRecord(character.characterId, getTestContext().lastHistoryRecord);
      });
    });
  });
});
