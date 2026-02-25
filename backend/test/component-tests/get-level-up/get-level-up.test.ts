import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getLevelUpResponseSchema, MAX_LEVEL } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { ApiClient } from "../api-client.js";
import { TestContext, TestContextFactory } from "../test-context-factory.js";

describe.sequential("get-level-up component tests", () => {
  describe("character with available level-up options", () => {
    let context: TestContext;

    beforeAll(async () => {
      context = await TestContextFactory.createContext();
    });

    afterAll(async () => {
      await TestContextFactory.cleanupContext(context);
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
            ? `characters/${_case.characterId}/level-up`
            : `characters/${character.characterId}/level-up`;
          const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

          await expectApiError(() => client.get(path), _case.expectedStatusCode, _case.expectedErrorMessage);
        });
      });
    });

    /**
     * =============================
     * Allowed level-up options
     * =============================
     */

    describe("allows level-up options when the requirements are satisfied", () => {
      const allowedCases = [
        {
          name: "hpRoll is available and exposes its dice expression",
          kind: "hpRoll",
          expectedValues: {
            allowed: true,
            firstLevel: 2,
            selectionCount: 6,
            maxSelectionCount: MAX_LEVEL - 1,
            cooldownLevels: 0,
            diceExpression: "1d4+2",
            firstChosenLevel: 3,
            lastChosenLevel: 20,
          },
        },
        {
          name: "armorLevelRoll is available after the cooldown passes",
          kind: "armorLevelRoll",
          expectedValues: {
            allowed: true,
            firstLevel: 2,
            selectionCount: 4,
            maxSelectionCount: MAX_LEVEL - 1,
            cooldownLevels: 2,
            diceExpression: "1d4+2",
            firstChosenLevel: 5,
            lastChosenLevel: 17,
          },
        },
        {
          name: "initiativePlusOne can be selected again after one level",
          kind: "initiativePlusOne",
          expectedValues: {
            allowed: true,
            firstLevel: 2,
            selectionCount: 5,
            maxSelectionCount: MAX_LEVEL - 1,
            cooldownLevels: 1,
            diceExpression: undefined,
            firstChosenLevel: 4,
            lastChosenLevel: 19,
          },
        },
        {
          name: "luckPlusOne stays available until its third pick",
          kind: "luckPlusOne",
          expectedValues: {
            allowed: true,
            firstLevel: 2,
            selectionCount: 2,
            maxSelectionCount: 3,
            cooldownLevels: 2,
            diceExpression: undefined,
            firstChosenLevel: 2,
            lastChosenLevel: 10,
          },
        },
        {
          name: "bonusActionPlusOne can be taken again long after the previous pick",
          kind: "bonusActionPlusOne",
          expectedValues: {
            allowed: true,
            firstLevel: 6,
            selectionCount: 1,
            maxSelectionCount: 3,
            cooldownLevels: 9,
            diceExpression: undefined,
            firstChosenLevel: 6,
            lastChosenLevel: 6,
          },
        },
        {
          name: "legendaryActionPlusOne unlocks once the character reaches the required level",
          kind: "legendaryActionPlusOne",
          expectedValues: {
            allowed: true,
            firstLevel: 11,
            selectionCount: 1,
            maxSelectionCount: 3,
            cooldownLevels: 9,
            diceExpression: undefined,
            firstChosenLevel: 11,
            lastChosenLevel: 11,
          },
        },
        {
          name: "rerollUnlock is available while it has not been chosen yet",
          kind: "rerollUnlock",
          expectedValues: {
            allowed: true,
            firstLevel: 2,
            selectionCount: 0,
            maxSelectionCount: 1,
            cooldownLevels: MAX_LEVEL,
            diceExpression: undefined,
            firstChosenLevel: undefined,
            lastChosenLevel: undefined,
          },
        },
      ];

      allowedCases.forEach((_case) => {
        test(_case.name, async () => {
          const character = context.character;

          const response = getLevelUpResponseSchema.parse(
            await context.apiClient.get(`characters/${character.characterId}/level-up`),
          );

          expect(response.userId).toBe(character.userId);
          expect(response.characterId).toBe(character.characterId);
          expect(response.nextLevel).toBe(character.characterSheet.generalInformation.level + 1);
          expect(response.optionsHash.length).toBeGreaterThan(1);
          expect(response.options.length).toBe(7); // 7 options defined in the rules

          const option = response.options.find((option) => option.kind === _case.kind);
          expect(option).toBeDefined();
          expect(option!.description).toBeDefined();
          expect(option!.allowed).toBe(_case.expectedValues.allowed);
          expect(option!.firstLevel).toBe(_case.expectedValues.firstLevel);
          expect(option!.selectionCount).toBe(_case.expectedValues.selectionCount);
          expect(option!.maxSelectionCount).toBe(_case.expectedValues.maxSelectionCount);
          expect(option!.cooldownLevels).toBe(_case.expectedValues.cooldownLevels);
          expect(option!.reasonIfDenied).toBeUndefined();
          expect(option!.diceExpression).toBe(_case.expectedValues.diceExpression);
          expect(option!.firstChosenLevel).toBe(_case.expectedValues.firstChosenLevel);
          expect(option!.lastChosenLevel).toBe(_case.expectedValues.lastChosenLevel);
        });
      });
    });
  });

  /**
   * =============================
   * Denied level-up options
   * =============================
   */

  describe("denies level-up options", () => {
    let context: TestContext;

    beforeAll(async () => {
      const characterId = TestContextFactory.loadCharacterIdFromTestData(
        "test-data/character-with-unavailable-level-ups.dynamodb.json",
      );
      context = await TestContextFactory.createContext(characterId);
    });

    afterAll(async () => {
      await TestContextFactory.cleanupContext(context);
    });

    const deniedTestCases = [
      {
        name: "Health roll is always available",
        kind: "hpRoll",
        expectedValues: {
          allowed: true,
          firstLevel: 2,
          selectionCount: 20,
          maxSelectionCount: MAX_LEVEL - 1,
          cooldownLevels: 0,
          reasonIfDenied: undefined,
          diceExpression: "1d4+2",
          firstChosenLevel: 4,
          lastChosenLevel: 29,
        },
      },
      {
        name: "rerollUnlock: Max selection count reached (1/1)",
        kind: "rerollUnlock",
        expectedValues: {
          allowed: false,
          firstLevel: 2,
          selectionCount: 1,
          maxSelectionCount: 1,
          cooldownLevels: MAX_LEVEL,
          reasonIfDenied: "Next available at level 1003. Maximum of 1 reached.",
          diceExpression: undefined,
          firstChosenLevel: 2,
          lastChosenLevel: 2,
        },
      },
      {
        name: "luckPlusOne: Max selection count reached (3/3)",
        kind: "luckPlusOne",
        expectedValues: {
          allowed: false,
          firstLevel: 2,
          selectionCount: 3,
          maxSelectionCount: 3,
          cooldownLevels: 2,
          reasonIfDenied: "Maximum of 3 reached.",
          diceExpression: undefined,
          firstChosenLevel: 3,
          lastChosenLevel: 9,
        },
      },
      {
        name: "bonusActionPlusOne: Max selection count reached (3/3)",
        kind: "bonusActionPlusOne",
        expectedValues: {
          allowed: false,
          firstLevel: 6,
          selectionCount: 3,
          maxSelectionCount: 3,
          cooldownLevels: 9,
          reasonIfDenied: "Next available at level 40. Maximum of 3 reached.",
          diceExpression: undefined,
          firstChosenLevel: 10,
          lastChosenLevel: 30,
        },
      },
      {
        name: "legendaryActionPlusOne: Max selection count reached (3/3)",
        kind: "legendaryActionPlusOne",
        expectedValues: {
          allowed: false,
          firstLevel: 11,
          selectionCount: 3,
          maxSelectionCount: 3,
          cooldownLevels: 9,
          reasonIfDenied: "Next available at level 41. Maximum of 3 reached.",
          diceExpression: undefined,
          firstChosenLevel: 11,
          lastChosenLevel: 31,
        },
      },
      {
        name: "armorLevelRoll: Cooldown active (chosen at level 32, current level 33)",
        kind: "armorLevelRoll",
        expectedValues: {
          allowed: false,
          firstLevel: 2,
          selectionCount: 1,
          maxSelectionCount: MAX_LEVEL - 1,
          cooldownLevels: 2,
          reasonIfDenied: "Next available at level 35.",
          diceExpression: "1d4+2",
          firstChosenLevel: 32,
          lastChosenLevel: 32,
        },
      },
      {
        name: "initiativePlusOne: Cooldown active (chosen at level 33, current level 33)",
        kind: "initiativePlusOne",
        expectedValues: {
          allowed: false,
          firstLevel: 2,
          selectionCount: 1,
          maxSelectionCount: MAX_LEVEL - 1,
          cooldownLevels: 1,
          reasonIfDenied: "Next available at level 35.",
          diceExpression: undefined,
          firstChosenLevel: 33,
          lastChosenLevel: 33,
        },
      },
    ];

    deniedTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;

        const response = getLevelUpResponseSchema.parse(
          await context.apiClient.get(`characters/${character.characterId}/level-up`),
        );

        expect(response.userId).toBe(character.userId);
        expect(response.characterId).toBe(character.characterId);
        expect(response.nextLevel).toBe(character.characterSheet.generalInformation.level + 1);
        expect(response.optionsHash.length).toBeGreaterThan(1);
        expect(response.options.length).toBe(7); // 7 options defined in the rules

        const option = response.options.find((option) => option.kind === _case.kind);
        expect(option).toBeDefined();
        expect(option!.allowed).toBe(_case.expectedValues.allowed);
        expect(option!.firstLevel).toBe(_case.expectedValues.firstLevel);
        expect(option!.selectionCount).toBe(_case.expectedValues.selectionCount);
        expect(option!.maxSelectionCount).toBe(_case.expectedValues.maxSelectionCount);
        expect(option!.cooldownLevels).toBe(_case.expectedValues.cooldownLevels);
        expect(option!.reasonIfDenied).toBe(_case.expectedValues.reasonIfDenied);
        expect(option!.diceExpression).toBe(_case.expectedValues.diceExpression);
        expect(option!.firstChosenLevel).toBe(_case.expectedValues.firstChosenLevel);
        expect(option!.lastChosenLevel).toBe(_case.expectedValues.lastChosenLevel);
      });
    });
  });
});
