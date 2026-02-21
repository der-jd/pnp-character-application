import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  patchSkillResponseSchema,
  CharacterSheet,
  Skill,
  CombatStats,
  CalculationPoints,
  HistoryRecordType,
  PatchSkillHistoryRecord,
} from "api-spec";
import { expectApiError, verifyCharacterState, verifyLatestHistoryRecord, commonInvalidTestCases } from "../shared.js";
import { apiClient, setupTestContext, cleanUpTestContext } from "../setup.js";
import { getTestContext, setTestContext } from "../test-context.js";
import { ApiClient } from "../api-client.js";

describe("patch-skill component tests", () => {
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
          ? `characters/${_case.characterId}/skills/body/athletics`
          : `characters/${character.characterId}/skills/body/athletics`;
        const client = new ApiClient(getTestContext().apiBaseUrl, authorizationHeader);

        await expectApiError(
          () =>
            client.patch(path, {
              current: {
                initialValue: 16,
                increasedPoints: 1,
              },
              learningMethod: "NORMAL",
            }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    test("activating a skill without learning method", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/nature/fishing`, {
            activated: true,
          }),
        409,
        "Learning method must be given",
      );
    });

    test("deactivating a skill is not allowed", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            activated: false,
          }),
        409,
        "Deactivating a skill is not allowed",
      );
    });

    test("passed initial start skill value doesn't match the value in the backend", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            start: {
              initialValue: 5,
              newValue: 8,
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial current skill value doesn't match the value in the backend", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            current: {
              initialValue: 10,
              increasedPoints: 15,
            },
            learningMethod: "NORMAL",
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial mod value doesn't match the value in the backend", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            mod: {
              initialValue: 7,
              newValue: 10,
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("skill is not activated (start value updated)", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/nature/fishing`, {
            start: {
              initialValue: 5,
              newValue: 6,
            },
          }),
        409,
        "Skill is not activated yet",
      );
    });

    test("skill is not activated (current value updated)", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/nature/fishing`, {
            current: {
              initialValue: 8,
              increasedPoints: 1,
            },
            learningMethod: "NORMAL",
          }),
        409,
        "Skill is not activated yet",
      );
    });

    test("skill is not activated (mod value updated)", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/nature/fishing`, {
            mod: {
              initialValue: 3,
              newValue: 5,
            },
          }),
        409,
        "Skill is not activated yet",
      );
    });

    test("not enough adventure points", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/combat/slashingWeaponsSharp1h`, {
            current: {
              initialValue: 120,
              increasedPoints: 50,
            },
            learningMethod: "EXPENSIVE",
          }),
        400,
        "Not enough adventure points",
      );
    });

    test("increased points are 0", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            current: {
              initialValue: 16,
              increasedPoints: 0,
            },
            learningMethod: "NORMAL",
          }),
        409,
        "Increased points must be greater than 0",
      );
    });

    test("increased points are negative", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            current: {
              initialValue: 16,
              increasedPoints: -3,
            },
            learningMethod: "NORMAL",
          }),
        409,
        "Increased points must be greater than 0",
      );
    });

    test("increasing a skill without learning method", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            current: {
              initialValue: 16,
              increasedPoints: 1,
            },
          }),
        409,
        "Learning method must be given",
      );
    });

    test("updating an inactive skill is not allowed", async () => {
      const character = getTestContext().character;

      await expectApiError(
        () =>
          apiClient.patch(`characters/${character.characterId}/skills/nature/fishing`, {
            start: {
              initialValue: 5,
              newValue: 6,
            },
          }),
        409,
        "Skill is not activated yet",
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
        name: "skill already activated (idempotency)",
        request: {
          skillCategory: "body",
          skillName: "athletics",
          body: {
            activated: true,
            learningMethod: "NORMAL",
          },
        },
      },
      {
        name: "skill has already been updated to the target start value (idempotency)",
        request: {
          skillCategory: "body",
          skillName: "athletics",
          body: {
            start: {
              initialValue: 9,
              newValue: 12,
            },
          },
        },
      },
      {
        name: "skill has already been increased to the target current value (idempotency)",
        request: {
          skillCategory: "body",
          skillName: "athletics",
          body: {
            current: {
              initialValue: 12,
              increasedPoints: 4,
            },
            learningMethod: "NORMAL",
          },
        },
      },
      {
        name: "combat skill has already been increased to the target current value (idempotency)",
        request: {
          skillCategory: "combat",
          skillName: "slashingWeaponsBlunt2h",
          body: {
            current: {
              initialValue: 14,
              increasedPoints: 4,
            },
            learningMethod: "NORMAL",
          },
        },
      },
      {
        name: "skill has already been updated to the target mod value (idempotency)",
        request: {
          skillCategory: "body",
          skillName: "athletics",
          body: {
            mod: {
              initialValue: 2,
              newValue: 4,
            },
          },
        },
      },
    ];

    idempotentTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = getTestContext().character;

        const response = patchSkillResponseSchema.parse(
          await apiClient.patch(
            `characters/${character.characterId}/skills/${_case.request.skillCategory}/${_case.request.skillName}`,
            _case.request.body,
          ),
        );

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.skillCategory).toBe(_case.request.skillCategory);
        expect(response.data.skillName).toBe(_case.request.skillName);

        // Verify idempotency - no history record
        expect(response.historyRecord).toBeNull();

        // Verify learning method if present
        if (_case.request.body.learningMethod) {
          expect(response.data.learningMethod).toBe(_case.request.body.learningMethod);
        }

        // Verify skill value updates
        if (_case.request.body.activated) {
          expect(response.data.changes.new.skill.activated).toBe(_case.request.body.activated);
        }

        if (_case.request.body.start) {
          expect(response.data.changes.new.skill.start).toBe(_case.request.body.start.newValue);
        }

        if (_case.request.body.current) {
          const expectedCurrent = _case.request.body.current.initialValue + _case.request.body.current.increasedPoints;
          expect(response.data.changes.new.skill.current).toBe(expectedCurrent);
        }

        if (_case.request.body.mod) {
          expect(response.data.changes.new.skill.mod).toBe(_case.request.body.mod.newValue);
        }

        expect(response.data.changes.old.skill).toStrictEqual(
          character.characterSheet.skills[_case.request.skillCategory as keyof CharacterSheet["skills"]][
            _case.request.skillName as keyof CharacterSheet["skills"][keyof CharacterSheet["skills"]]
          ],
        );
        expect(response.data.changes.new.skill).toStrictEqual(response.data.changes.old.skill);

        // Verify no adventure points were spent
        const oldAvailableAdventurePoints = character.characterSheet.calculationPoints.adventurePoints.available;
        const diffAvailableAdventurePoints = oldAvailableAdventurePoints - response.data.adventurePoints.new.available;
        expect(diffAvailableAdventurePoints).toBeCloseTo(0);

        // Verify no skill cost changes
        const oldTotalSkillCost = response.data.changes.old.skill.totalCost;
        const diffSkillTotalCost = response.data.changes.new.skill.totalCost - oldTotalSkillCost;
        expect(diffAvailableAdventurePoints).toBeCloseTo(diffSkillTotalCost);

        if (response.data.increaseCost) {
          if (_case.request.skillCategory === "combat") {
            // Below first cost threshold for combat skills
            expect(response.data.increaseCost).toBe(2);
          } else {
            // Below first cost threshold for non-combat skills
            expect(response.data.increaseCost).toBe(1);
          }
        }

        // Verify combat category/stats
        if (_case.request.skillCategory === "combat") {
          expect(response.data.combatCategory).toBe("melee"); // Our request data is a melee combat skill
        } else {
          expect(response.data.combatCategory).toBeUndefined();
        }
        expect(response.data.changes.old.combatStats).toBeUndefined();
        expect(response.data.changes.new.combatStats).toBeUndefined();

        // Character from the backend should be still identical to the one before the update
        await verifyCharacterState(character.characterId, getTestContext().character);

        // Latest history record should be the same as the one before the update
        await verifyLatestHistoryRecord(character.characterId, getTestContext().lastHistoryRecord);
      });
    });
  });

  /**
   * =============================
   * Patch skill
   * =============================
   */

  describe("Patch skill", () => {
    const updateTestCases = [
      {
        name: "activate skill (cost category: FREE)",
        request: {
          skillCategory: "nature",
          skillName: "fishing",
          body: {
            activated: true,
            learningMethod: "FREE",
          },
        },
        expectedCosts: 0,
      },
      {
        name: "activate skill (cost category: LOW_PRICED)",
        request: {
          skillCategory: "nature",
          skillName: "trapping",
          body: {
            activated: true,
            learningMethod: "LOW_PRICED",
          },
        },
        expectedCosts: 40,
      },
      {
        name: "activate skill (cost category: NORMAL)",
        request: {
          skillCategory: "social",
          skillName: "convincing",
          body: {
            activated: true,
            learningMethod: "NORMAL",
          },
        },
        expectedCosts: 50,
      },
      {
        name: "activate skill (cost category: EXPENSIVE)",
        request: {
          skillCategory: "body",
          skillName: "riding",
          body: {
            activated: true,
            learningMethod: "EXPENSIVE",
          },
        },
        expectedCosts: 60,
      },
      {
        name: "update start skill value",
        request: {
          skillCategory: "body",
          skillName: "athletics",
          body: {
            start: {
              initialValue: 12,
              newValue: 15,
            },
          },
        },
        expectedCosts: 0,
      },
      {
        name: "increase current skill value by 3 points (cost category: FREE)",
        request: {
          skillCategory: "body",
          skillName: "athletics",
          body: {
            current: {
              initialValue: 16,
              increasedPoints: 3,
            },
            learningMethod: "FREE",
          },
        },
        expectedCosts: 0,
      },
      {
        name: "increase current skill value by 3 points (cost category: LOW_PRICED)",
        request: {
          skillCategory: "body",
          skillName: "athletics",
          body: {
            current: {
              initialValue: 19,
              increasedPoints: 3,
            },
            learningMethod: "LOW_PRICED",
          },
        },
        expectedCosts: 1.5,
      },
      {
        name: "increase current skill value by 3 points (cost category: EXPENSIVE)",
        request: {
          skillCategory: "body",
          skillName: "athletics",
          body: {
            current: {
              initialValue: 22,
              increasedPoints: 3,
            },
            learningMethod: "EXPENSIVE",
          },
        },
        expectedCosts: 6,
      },
      {
        name: "update mod value",
        request: {
          skillCategory: "body",
          skillName: "athletics",
          body: {
            mod: {
              initialValue: 4,
              newValue: 7,
            },
          },
        },
        expectedCosts: 0,
      },
      {
        name: "update all skill values (activated, start, current, mod)",
        request: {
          skillCategory: "body",
          skillName: "juggleries",
          body: {
            activated: true,
            start: {
              initialValue: 12,
              newValue: 10,
            },
            current: {
              initialValue: 16,
              increasedPoints: 1,
            },
            mod: {
              initialValue: 4,
              newValue: 5,
            },
            learningMethod: "NORMAL",
          },
        },
        expectedCosts: 51,
      },
      {
        name: "update combat skill values",
        request: {
          skillCategory: "combat",
          skillName: "daggers",
          body: {
            current: {
              initialValue: 18,
              increasedPoints: 10,
            },
            mod: {
              initialValue: 8,
              newValue: 10,
            },
            learningMethod: "FREE",
          },
        },
        expectedCosts: 0,
      },
    ];

    updateTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = getTestContext().character;

        const response = patchSkillResponseSchema.parse(
          await apiClient.patch(
            `characters/${character.characterId}/skills/${_case.request.skillCategory}/${_case.request.skillName}`,
            _case.request.body,
          ),
        );

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.skillCategory).toBe(_case.request.skillCategory);
        expect(response.data.skillName).toBe(_case.request.skillName);

        // Verify learning method if present
        if (_case.request.body.learningMethod) {
          expect(response.data.learningMethod).toBe(_case.request.body.learningMethod);
        }

        // Verify skill activation if present
        if (_case.request.body.activated) {
          expect(response.data.changes.new.skill.activated).toBe(_case.request.body.activated);
        }

        // Verify skill value updates
        if (_case.request.body.activated) {
          expect(response.data.changes.new.skill.activated).toBe(_case.request.body.activated);
        }

        if (_case.request.body.start) {
          expect(response.data.changes.new.skill.start).toBe(_case.request.body.start.newValue);
        }

        if (_case.request.body.current) {
          const expectedCurrent = _case.request.body.current.initialValue + _case.request.body.current.increasedPoints;
          expect(response.data.changes.new.skill.current).toBe(expectedCurrent);
        }

        if (_case.request.body.mod) {
          expect(response.data.changes.new.skill.mod).toBe(_case.request.body.mod.newValue);
        }

        // Verify adventure points were spent correctly
        const oldAdventurePoints = character.characterSheet.calculationPoints.adventurePoints;
        const oldAvailableAdventurePoints = oldAdventurePoints.available;
        const diffAvailableAdventurePoints = oldAvailableAdventurePoints - response.data.adventurePoints.new.available;
        expect(diffAvailableAdventurePoints).toBeCloseTo(_case.expectedCosts);
        expect(diffAvailableAdventurePoints).toBeCloseTo(
          response.data.adventurePoints.old.available - response.data.adventurePoints.new.available,
        );
        expect(response.data.adventurePoints.old).toStrictEqual(oldAdventurePoints);
        expect(response.data.adventurePoints.new).toStrictEqual({
          ...oldAdventurePoints,
          available: oldAvailableAdventurePoints - diffAvailableAdventurePoints,
        });

        // Verify skill cost changes
        const _skillCategory = response.data.skillCategory as keyof CharacterSheet["skills"];
        const _skillName = response.data.skillName as keyof CharacterSheet["skills"][typeof _skillCategory];
        const skillOld = character.characterSheet.skills[_skillCategory][_skillName] as Skill;
        const oldTotalSkillCost = skillOld.totalCost;
        const diffSkillTotalCost = response.data.changes.new.skill.totalCost - oldTotalSkillCost;
        expect(diffAvailableAdventurePoints).toBeCloseTo(diffSkillTotalCost);

        expect(response.data.changes.old.skill).toStrictEqual(skillOld);

        // Verify combat stats
        if (_skillCategory === "combat") {
          expect(response.data.combatCategory).toBe("melee"); // We only test melee combat skills here
          expect(response.data.changes.old.combatStats).toBeDefined();
          expect(response.data.changes.new.combatStats).toBeDefined();

          const _oldCombatStats = character.characterSheet.combat.melee[_skillName] as CombatStats;
          expect(response.data.changes.old.combatStats).toStrictEqual(_oldCombatStats);
          expect(response.data.changes.new.combatStats).toStrictEqual({
            ..._oldCombatStats,
            available: expect.any(Number),
          });

          const availableCombatPointsNew =
            _oldCombatStats.availablePoints +
            (response.data.changes.new.skill.current - response.data.changes.old.skill.current) +
            (response.data.changes.new.skill.mod - response.data.changes.old.skill.mod);
          expect(response.data.changes.new.combatStats!.availablePoints).toBe(availableCombatPointsNew);
        } else {
          // Verify no combat category/stats for non-combat skills
          expect(response.data.combatCategory).toBeUndefined();
          expect(response.data.changes.old.combatStats).toBeUndefined();
          expect(response.data.changes.new.combatStats).toBeUndefined();
        }

        // Verify history record was created
        expect(response.historyRecord).not.toBeNull();

        const historyRecord = response.historyRecord as PatchSkillHistoryRecord;

        // Verify basic record properties
        expect(historyRecord.type).toBe(HistoryRecordType.SKILL_CHANGED);
        expect(historyRecord.name).toBe(`${_skillCategory}/${_skillName}`);
        expect(historyRecord.number).toBeGreaterThan(0);
        expect(historyRecord.id).toBeDefined();
        expect(historyRecord.timestamp).toBeDefined();

        // Verify record data matches response changes
        expect(historyRecord.data.old).toStrictEqual(response.data.changes.old);
        expect(historyRecord.data.new).toStrictEqual(response.data.changes.new);

        // Verify learning method if present in request
        if (_case.request.body.learningMethod) {
          expect(historyRecord.learningMethod).toBe(_case.request.body.learningMethod);
        } else {
          expect(historyRecord.learningMethod).toBeNull();
        }

        // Verify calculation points changes
        expect(historyRecord.calculationPoints.adventurePoints).toBeDefined();
        expect(historyRecord.calculationPoints.adventurePoints!.old).toStrictEqual(response.data.adventurePoints.old);
        expect(historyRecord.calculationPoints.adventurePoints!.new).toStrictEqual(response.data.adventurePoints.new);
        expect(historyRecord.calculationPoints.attributePoints).toBeNull();

        // Verify comment is null (not set in this operation)
        expect(historyRecord.comment).toBeNull();

        // Update test context
        (character.characterSheet.skills[_skillCategory][_skillName] as Skill) = response.data.changes.new.skill;
        if (response.data.combatCategory) {
          const _combatCategory = response.data.combatCategory as keyof CharacterSheet["combat"];
          (character.characterSheet.combat[_combatCategory][_skillName] as CombatStats) = response.data.changes.new.combatStats!;
        }
        character.characterSheet.calculationPoints.adventurePoints = response.data.adventurePoints.new;

        setTestContext({
          character,
          lastHistoryRecord: response.historyRecord!
        });

        await verifyCharacterState(character.characterId, character);

        await verifyLatestHistoryRecord(character.characterId, getTestContext().lastHistoryRecord);
      });
    });
  });
});
