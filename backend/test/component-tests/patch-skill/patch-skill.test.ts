import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  patchSkillResponseSchema,
  CharacterSheet,
  Skill,
  CombatStats,
  HistoryRecordType,
  PatchSkillHistoryRecord,
  Character,
  PatchSkillResponse,
  HistoryRecord,
} from "api-spec";
import { expectApiError, commonInvalidTestCases, updateAndVerifyTestContextAfterEachTest } from "../shared.js";
import { TestContextFactory, TestContext } from "../test-context-factory.js";
import { ApiClient } from "../api-client.js";

describe.sequential("patch-skill component tests", () => {
  let context: TestContext;
  let currentResponse: PatchSkillResponse | undefined;

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
      (response: PatchSkillResponse, character: Character) => {
        const _skillCategory = response.data.skillCategory as keyof CharacterSheet["skills"];
        const _skillName = response.data.skillName as keyof CharacterSheet["skills"][typeof _skillCategory];

        (character.characterSheet.skills[_skillCategory][_skillName] as Skill) = response.data.changes.new.skill;
        if (response.data.combatCategory) {
          const _combatCategory = response.data.combatCategory as keyof CharacterSheet["combat"];
          (character.characterSheet.combat[_combatCategory][_skillName] as CombatStats) =
            response.data.changes.new.combatStats!;
        }
        character.characterSheet.calculationPoints.adventurePoints = response.data.adventurePoints.new;
      },
      (response: PatchSkillResponse, record: HistoryRecord) => {
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
          ? `characters/${_case.characterId}/skills/body/athletics`
          : `characters/${character.characterId}/skills/body/athletics`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

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
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/nature/fishing`, {
            activated: true,
          }),
        409,
        "Learning method must be given",
      );
    });

    test("deactivating a skill is not allowed", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            activated: false,
          }),
        409,
        "Deactivating a skill is not allowed",
      );
    });

    test("passed initial start skill value doesn't match the value in the backend", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            start: {
              initialValue: character.characterSheet.skills.body.athletics.start + 2,
              newValue: character.characterSheet.skills.body.athletics.start + 4,
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial current skill value doesn't match the value in the backend", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            current: {
              initialValue: character.characterSheet.skills.body.athletics.current + 3,
              increasedPoints: 15,
            },
            learningMethod: "NORMAL",
          }),
        409,
        "doesn't match",
      );
    });

    test("passed initial mod value doesn't match the value in the backend", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            mod: {
              initialValue: character.characterSheet.skills.body.athletics.mod + 1,
              newValue: character.characterSheet.skills.body.athletics.mod + 4,
            },
          }),
        409,
        "doesn't match",
      );
    });

    test("skill is not activated (start value updated)", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/nature/fishing`, {
            start: {
              initialValue: character.characterSheet.skills.nature.fishing.start,
              newValue: character.characterSheet.skills.nature.fishing.start + 1,
            },
          }),
        409,
        "Skill is not activated yet",
      );
    });

    test("skill is not activated (current value updated)", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/nature/fishing`, {
            current: {
              initialValue: character.characterSheet.skills.nature.fishing.current,
              increasedPoints: 1,
            },
            learningMethod: "NORMAL",
          }),
        409,
        "Skill is not activated yet",
      );
    });

    test("skill is not activated (mod value updated)", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/nature/fishing`, {
            mod: {
              initialValue: character.characterSheet.skills.nature.fishing.mod,
              newValue: character.characterSheet.skills.nature.fishing.mod + 1,
            },
          }),
        409,
        "Skill is not activated yet",
      );
    });

    test("not enough adventure points", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/combat/slashingWeaponsSharp1h`, {
            current: {
              initialValue: character.characterSheet.skills.combat.slashingWeaponsSharp1h.current,
              increasedPoints: 300,
            },
            learningMethod: "EXPENSIVE",
          }),
        400,
        "Not enough adventure points",
      );
    });

    test("increased points are 0", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            current: {
              initialValue: character.characterSheet.skills.body.athletics.current,
              increasedPoints: 0,
            },
            learningMethod: "NORMAL",
          }),
        400,
        "Invalid input values!",
      );
    });

    test("increased points are negative", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            current: {
              initialValue: character.characterSheet.skills.body.athletics.current,
              increasedPoints: -3,
            },
            learningMethod: "NORMAL",
          }),
        400,
        "Invalid input values!",
      );
    });

    test("increasing a skill without learning method", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.patch(`characters/${character.characterId}/skills/body/athletics`, {
            current: {
              initialValue: character.characterSheet.skills.body.athletics.current,
              increasedPoints: 1,
            },
          }),
        409,
        "Learning method must be given",
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
        skillCategory: "body",
        skillName: "athletics",
        getBody: () => ({
          activated: true,
          learningMethod: "NORMAL",
        }),
      },
      {
        name: "skill has already been updated to the target start value (idempotency)",
        skillCategory: "body",
        skillName: "athletics",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.skills.body.athletics.start - 2,
            newValue: character.characterSheet.skills.body.athletics.start,
          },
        }),
      },
      {
        name: "skill has already been increased to the target current value (idempotency)",
        skillCategory: "body",
        skillName: "athletics",
        getBody: (character: Character) => ({
          current: {
            initialValue: character.characterSheet.skills.body.athletics.current - 4,
            increasedPoints: 4,
          },
          learningMethod: "NORMAL",
        }),
      },
      {
        name: "combat skill has already been increased to the target current value (idempotency)",
        skillCategory: "combat",
        skillName: "slashingWeaponsBlunt2h",
        getBody: (character: Character) => ({
          current: {
            initialValue: character.characterSheet.skills.combat.slashingWeaponsBlunt2h.current - 4,
            increasedPoints: 4,
          },
          learningMethod: "NORMAL",
        }),
      },
      {
        name: "skill has already been updated to the target mod value (idempotency)",
        skillCategory: "body",
        skillName: "athletics",
        getBody: (character: Character) => ({
          mod: {
            initialValue: character.characterSheet.skills.body.athletics.mod - 1,
            newValue: character.characterSheet.skills.body.athletics.mod,
          },
        }),
      },
    ];

    idempotentTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const body = _case.getBody(character);

        const response = patchSkillResponseSchema.parse(
          await context.apiClient.patch(
            `characters/${character.characterId}/skills/${_case.skillCategory}/${_case.skillName}`,
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
        expect(response.data.skillCategory).toBe(_case.skillCategory);
        expect(response.data.skillName).toBe(_case.skillName);

        // Verify idempotency - no history record
        expect(response.historyRecord).toBeNull();

        // Verify learning method if present
        if ("learningMethod" in body) {
          expect(response.data.learningMethod).toBe(body.learningMethod);
        }

        // Verify skill value updates
        if ("activated" in body) {
          expect(response.data.changes.new.skill.activated).toBe(body.activated);
        }

        if ("start" in body) {
          expect(response.data.changes.new.skill.start).toBe(body.start.newValue);
        }

        if ("current" in body) {
          const expectedCurrent = body.current.initialValue + body.current.increasedPoints;
          expect(response.data.changes.new.skill.current).toBe(expectedCurrent);
        }

        if ("mod" in body) {
          expect(response.data.changes.new.skill.mod).toBe(body.mod.newValue);
        }

        expect(response.data.changes.old.skill).toStrictEqual(
          character.characterSheet.skills[_case.skillCategory as keyof CharacterSheet["skills"]][
            _case.skillName as keyof CharacterSheet["skills"][keyof CharacterSheet["skills"]]
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
          if (_case.skillCategory === "combat") {
            // Below first cost threshold for combat skills
            expect(response.data.increaseCost).toBe(2);
          } else {
            // Below first cost threshold for non-combat skills
            expect(response.data.increaseCost).toBe(1);
          }
        }

        // Verify combat category/stats
        if (_case.skillCategory === "combat") {
          expect(response.data.combatCategory).toBe("melee"); // Our request data is a melee combat skill
        } else {
          expect(response.data.combatCategory).toBeUndefined();
        }
        expect(response.data.changes.old.combatStats).toBeUndefined();
        expect(response.data.changes.new.combatStats).toBeUndefined();
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
        skillCategory: "nature",
        skillName: "fishing",
        getBody: () => ({
          activated: true,
          learningMethod: "FREE",
        }),
        expectedCosts: 0,
      },
      {
        name: "activate skill (cost category: LOW_PRICED)",
        skillCategory: "nature",
        skillName: "trapping",
        getBody: () => ({
          activated: true,
          learningMethod: "LOW_PRICED",
        }),
        expectedCosts: 40,
      },
      {
        name: "activate skill (cost category: NORMAL)",
        skillCategory: "social",
        skillName: "convincing",
        getBody: () => ({
          activated: true,
          learningMethod: "NORMAL",
        }),
        expectedCosts: 50,
      },
      {
        name: "activate skill (cost category: EXPENSIVE)",
        skillCategory: "body",
        skillName: "riding",
        getBody: () => ({
          activated: true,
          learningMethod: "EXPENSIVE",
        }),
        expectedCosts: 60,
      },
      {
        name: "update start skill value",
        skillCategory: "body",
        skillName: "athletics",
        getBody: (character: Character) => ({
          start: {
            initialValue: character.characterSheet.skills.body.athletics.start,
            newValue: character.characterSheet.skills.body.athletics.start + 6,
          },
        }),
        expectedCosts: 0,
      },
      {
        name: "increase current skill value by 3 points (cost category: FREE)",
        skillCategory: "body",
        skillName: "athletics",
        getBody: (character: Character) => ({
          current: {
            initialValue: character.characterSheet.skills.body.athletics.current,
            increasedPoints: 3,
          },
          learningMethod: "FREE",
        }),
        expectedCosts: 0,
      },
      {
        name: "increase current skill value by 3 points (cost category: LOW_PRICED)",
        skillCategory: "body",
        skillName: "athletics",
        getBody: (character: Character) => ({
          current: {
            initialValue: character.characterSheet.skills.body.athletics.current,
            increasedPoints: 3,
          },
          learningMethod: "LOW_PRICED",
        }),
        expectedCosts: 1.5, // Assuming the skill is below the first cost threshold
      },
      {
        name: "increase current skill value by 3 points (cost category: EXPENSIVE)",
        skillCategory: "body",
        skillName: "athletics",
        getBody: (character: Character) => ({
          current: {
            initialValue: character.characterSheet.skills.body.athletics.current,
            increasedPoints: 3,
          },
          learningMethod: "EXPENSIVE",
        }),
        expectedCosts: 6, // Assuming the skill is below the first cost threshold
      },
      {
        name: "update mod value",
        skillCategory: "body",
        skillName: "athletics",
        getBody: (character: Character) => ({
          mod: {
            initialValue: character.characterSheet.skills.body.athletics.mod,
            newValue: character.characterSheet.skills.body.athletics.mod + 5,
          },
        }),
        expectedCosts: 0,
      },
      {
        name: "update all skill values (activated, start, current, mod)",
        skillCategory: "body",
        skillName: "juggleries",
        getBody: (character: Character) => ({
          activated: true,
          start: {
            initialValue: character.characterSheet.skills.body.juggleries.start,
            newValue: character.characterSheet.skills.body.juggleries.start + 10,
          },
          current: {
            initialValue: character.characterSheet.skills.body.juggleries.current,
            increasedPoints: 1,
          },
          mod: {
            initialValue: character.characterSheet.skills.body.juggleries.mod,
            newValue: character.characterSheet.skills.body.juggleries.mod + 5,
          },
          learningMethod: "NORMAL",
        }),
        expectedCosts: 51, // Assuming the skill is below the first cost threshold
      },
      {
        name: "update combat skill values",
        skillCategory: "combat",
        skillName: "daggers",
        getBody: (character: Character) => ({
          current: {
            initialValue: character.characterSheet.skills.combat.daggers.current,
            increasedPoints: 10,
          },
          mod: {
            initialValue: character.characterSheet.skills.combat.daggers.mod,
            newValue: character.characterSheet.skills.combat.daggers.mod + 2,
          },
          learningMethod: "FREE",
        }),
        expectedCosts: 0,
      },
    ];

    updateTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const body = _case.getBody(character);

        const response = patchSkillResponseSchema.parse(
          await context.apiClient.patch(
            `characters/${character.characterId}/skills/${_case.skillCategory}/${_case.skillName}`,
            body,
          ),
        );
        currentResponse = response;

        // Verify response structure
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.skillCategory).toBe(_case.skillCategory);
        expect(response.data.skillName).toBe(_case.skillName);

        // Verify learning method if present
        if ("learningMethod" in body) {
          expect(response.data.learningMethod).toBe(body.learningMethod);
        }

        // Verify skill activation if present
        if ("activated" in body) {
          expect(response.data.changes.new.skill.activated).toBe(body.activated);
        }

        if ("start" in body) {
          expect(response.data.changes.new.skill.start).toBe(body.start.newValue);
        }

        if ("current" in body) {
          const expectedCurrent = body.current.initialValue + body.current.increasedPoints;
          expect(response.data.changes.new.skill.current).toBe(expectedCurrent);
        }

        if ("mod" in body) {
          expect(response.data.changes.new.skill.mod).toBe(body.mod.newValue);
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
          const availableCombatPointsNew =
            _oldCombatStats.availablePoints +
            (response.data.changes.new.skill.current - response.data.changes.old.skill.current) +
            (response.data.changes.new.skill.mod - response.data.changes.old.skill.mod);
          expect(response.data.changes.new.combatStats).toStrictEqual({
            ..._oldCombatStats,
            availablePoints: availableCombatPointsNew,
          });
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
        if ("learningMethod" in body) {
          expect(historyRecord.learningMethod).toBe(body.learningMethod);
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
      });
    });
  });
});
