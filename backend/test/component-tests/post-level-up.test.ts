import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  postLevelUpResponseSchema,
  getLevelUpResponseSchema,
  LEVEL_UP_DICE_EXPRESSION,
  BaseValues,
  HistoryRecordType,
  PostLevelUpHistoryRecord,
  PostLevelUpResponse,
  Character,
  HistoryRecord,
  type PostLevelUpRequest,
} from "api-spec";
import { expectApiError, commonInvalidTestCases, updateAndVerifyTestContextAfterEachTest } from "./shared.js";
import { ApiClient } from "./api-client.js";
import { TestContext, TestContextFactory } from "./test-context-factory.js";

async function fetchOptionsHash(client: ApiClient, characterId: string): Promise<string> {
  const response = getLevelUpResponseSchema.parse(await client.get(`characters/${characterId}/level-up`));
  return response.optionsHash;
}

describe.sequential("post-level-up component tests", () => {
  let context: TestContext;
  let currentResponse: PostLevelUpResponse | undefined;

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
      (response: PostLevelUpResponse, character: Character) => {
        character.characterSheet.generalInformation.level = response.data.changes.new.level;
        character.characterSheet.generalInformation.levelUpProgress = response.data.changes.new.levelUpProgress;

        if (response.data.changes.new.baseValues) {
          for (const [baseValueName, baseValue] of Object.entries(response.data.changes.new.baseValues)) {
            character.characterSheet.baseValues[baseValueName as keyof BaseValues] = baseValue;
          }
        }

        if (response.data.changes.new.specialAbilities) {
          character.characterSheet.specialAbilities = response.data.changes.new.specialAbilities;
        }
      },
      (response: PostLevelUpResponse, record: HistoryRecord) => {
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
          ? `characters/${_case.characterId}/level-up`
          : `characters/${character.characterId}/level-up`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        const body = {
          initialLevel: character.characterSheet.generalInformation.level,
          effect: {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          },
          optionsHash: await fetchOptionsHash(context.apiClient, character.characterId),
        };

        await expectApiError(() => client.post(path, body), _case.expectedStatusCode, _case.expectedErrorMessage);
      });
    });

    test("initial level doesn't match the current level", async () => {
      const character = context.character;
      const optionsHash = await fetchOptionsHash(context.apiClient, character.characterId);

      await expectApiError(
        () =>
          context.apiClient.post(`characters/${character.characterId}/level-up`, {
            initialLevel: character.characterSheet.generalInformation.level - 1,
            optionsHash,
            effect: { kind: "hpRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 } },
          }),
        409,
        "initial level",
      );
    });

    test("options hash is stale", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.post(`characters/${character.characterId}/level-up`, {
            initialLevel: character.characterSheet.generalInformation.level,
            optionsHash: "stale",
            effect: { kind: "hpRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 } },
          }),
        409,
        "Options have changed",
      );
    });

    test("hp roll has a value above the maximum", async () => {
      const character = context.character;
      const optionsHash = await fetchOptionsHash(context.apiClient, character.characterId);

      await expectApiError(
        () =>
          context.apiClient.post(`characters/${character.characterId}/level-up`, {
            initialLevel: character.characterSheet.generalInformation.level,
            optionsHash,
            effect: { kind: "hpRoll", roll: { dice: "1d4+2", value: 7 } },
          }),
        400,
      );
    });

    test("hp roll has a value below the minimum", async () => {
      const character = context.character;
      const optionsHash = await fetchOptionsHash(context.apiClient, character.characterId);

      await expectApiError(
        () =>
          context.apiClient.post(`characters/${character.characterId}/level-up`, {
            initialLevel: character.characterSheet.generalInformation.level,
            optionsHash,
            effect: { kind: "hpRoll", roll: { dice: "1d4+2", value: 2 } },
          }),
        400,
      );
    });

    test("hp roll has an invalid dice expression", async () => {
      const character = context.character;
      const optionsHash = await fetchOptionsHash(context.apiClient, character.characterId);

      await expectApiError(
        () =>
          context.apiClient.post(`characters/${character.characterId}/level-up`, {
            initialLevel: character.characterSheet.generalInformation.level,
            optionsHash,
            effect: { kind: "hpRoll", roll: { dice: "1d6+1", value: 3 } },
          }),
        400,
      );
    });

    test("armor level roll has a value above the maximum", async () => {
      const character = context.character;
      const optionsHash = await fetchOptionsHash(context.apiClient, character.characterId);

      await expectApiError(
        () =>
          context.apiClient.post(`characters/${character.characterId}/level-up`, {
            initialLevel: character.characterSheet.generalInformation.level,
            optionsHash,
            effect: { kind: "armorLevelRoll", roll: { dice: "1d4+2", value: 7 } },
          }),
        400,
      );
    });

    test("armor level roll has a value below the minimum", async () => {
      const character = context.character;
      const optionsHash = await fetchOptionsHash(context.apiClient, character.characterId);

      await expectApiError(
        () =>
          context.apiClient.post(`characters/${character.characterId}/level-up`, {
            initialLevel: character.characterSheet.generalInformation.level,
            optionsHash,
            effect: { kind: "armorLevelRoll", roll: { dice: "1d4+2", value: 2 } },
          }),
        400,
      );
    });

    test("armor level roll has an invalid dice expression", async () => {
      const character = context.character;
      const optionsHash = await fetchOptionsHash(context.apiClient, character.characterId);

      await expectApiError(
        () =>
          context.apiClient.post(`characters/${character.characterId}/level-up`, {
            initialLevel: character.characterSheet.generalInformation.level,
            optionsHash,
            effect: { kind: "armorLevelRoll", roll: { dice: "1d6+1", value: 3 } },
          }),
        400,
      );
    });

    /**
     * The full set of invalid effects for the current level are tested by the component tests get-level-up.test.ts.
     * By passing the options hash in the body, we ensure that the options are not stale and follow the same logic.
     */
  });

  /**
   * =============================
   * Idempotency check
   * =============================
   */

  describe("Idempotency check", () => {
    test("applying a level-up with the same initial level returns 409 (not idempotent)", async () => {
      const character = context.character;
      const body = {
        initialLevel: character.characterSheet.generalInformation.level,
        effect: {
          kind: "hpRoll",
          roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
        },
        optionsHash: await fetchOptionsHash(context.apiClient, character.characterId),
      };

      const response = postLevelUpResponseSchema.parse(
        await context.apiClient.post(`characters/${character.characterId}/level-up`, body),
      );
      currentResponse = response;

      await expectApiError(
        () => context.apiClient.post(`characters/${character.characterId}/level-up`, body),
        409,
        "initial level",
      );
    });
  });

  /**
   * =============================
   * Valid requests
   * =============================
   */

  describe("Valid requests", () => {
    const validTestCases: Array<{
      name: string;
      effect: PostLevelUpRequest["effect"];
      baseValueKey?: keyof BaseValues;
      expectedDelta?: number;
      expectSpecialAbilities?: boolean;
    }> = [
      {
        name: "hpRoll increases health points",
        effect: { kind: "hpRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 } },
        baseValueKey: "healthPoints",
        expectedDelta: 4,
      },
      {
        name: "armorLevelRoll increases armor level",
        effect: { kind: "armorLevelRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 3 } },
        baseValueKey: "armorLevel",
        expectedDelta: 3,
      },
      {
        name: "initiativePlusOne increases initiative base value",
        effect: { kind: "initiativePlusOne", delta: 1 },
        baseValueKey: "initiativeBaseValue",
        expectedDelta: 1,
      },
      {
        name: "luckPlusOne increases luck points",
        effect: { kind: "luckPlusOne", delta: 1 },
        baseValueKey: "luckPoints",
        expectedDelta: 1,
      },
      {
        name: "bonusActionPlusOne increases bonus actions",
        effect: { kind: "bonusActionPlusOne", delta: 1 },
        baseValueKey: "bonusActionsPerCombatRound",
        expectedDelta: 1,
      },
      {
        name: "legendaryActionPlusOne increases legendary actions",
        effect: { kind: "legendaryActionPlusOne", delta: 1 },
        baseValueKey: "legendaryActions",
        expectedDelta: 1,
      },
      {
        name: "rerollUnlock adds special ability",
        effect: { kind: "rerollUnlock" },
        expectSpecialAbilities: true,
      },
    ];

    validTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;
        const initialLevel = character.characterSheet.generalInformation.level;
        const nextLevel = initialLevel + 1;
        const oldProgress = structuredClone(character.characterSheet.generalInformation.levelUpProgress);

        const body = {
          initialLevel: character.characterSheet.generalInformation.level,
          effect: _case.effect,
          optionsHash: await fetchOptionsHash(context.apiClient, character.characterId),
        };

        const response = postLevelUpResponseSchema.parse(
          await context.apiClient.post(`characters/${character.characterId}/level-up`, body),
        );
        currentResponse = response;

        expect(response.data.characterId).toBe(character.characterId);
        expect(response.data.userId).toBe(character.userId);
        expect(response.data.effectKind).toBe(_case.effect.kind);

        expect(response.data.changes.old.level).toBe(initialLevel);
        expect(response.data.changes.new.level).toBe(nextLevel);

        expect(response.data.changes.old.levelUpProgress).toStrictEqual(oldProgress);
        const newProgress = response.data.changes.new.levelUpProgress;
        const levelKey = String(nextLevel);
        expect(newProgress.effectsByLevel).toStrictEqual({
          ...oldProgress.effectsByLevel,
          [levelKey]: _case.effect,
        });
        expect(newProgress.effects[_case.effect.kind]).toBeDefined();
        expect(newProgress.effects[_case.effect.kind]!.selectionCount).toBe(
          (oldProgress.effects[_case.effect.kind]?.selectionCount ?? 0) + 1,
        );
        expect(newProgress.effects[_case.effect.kind]!.firstChosenLevel).toBe(
          oldProgress.effects[_case.effect.kind]?.firstChosenLevel ?? nextLevel,
        );
        expect(newProgress.effects[_case.effect.kind]!.lastChosenLevel).toBe(nextLevel);

        // Except for the effect that was just chosen, all other effects should be the same
        const newEffects = { ...newProgress.effects };
        delete newEffects[_case.effect.kind];
        const oldEffects = { ...oldProgress.effects };
        delete oldEffects[_case.effect.kind];
        expect(newEffects).toStrictEqual(oldEffects);

        if (_case.baseValueKey && _case.expectedDelta) {
          const baseValueName = _case.baseValueKey;
          const oldBaseValue = character.characterSheet.baseValues[baseValueName];
          expect(response.data.changes.old.baseValues?.[baseValueName]).toStrictEqual(oldBaseValue);
          expect(response.data.changes.new.baseValues?.[baseValueName]).toBeDefined();
          expect(response.data.changes.new.baseValues?.[baseValueName]).toStrictEqual({
            ...oldBaseValue,
            current: oldBaseValue.current + _case.expectedDelta,
            byLvlUp: (oldBaseValue.byLvlUp ?? 0) + _case.expectedDelta,
          });
        } else {
          expect(response.data.changes.new.baseValues).toBeUndefined();
        }

        if (_case.expectSpecialAbilities) {
          expect(response.data.changes.old.specialAbilities).toStrictEqual(character.characterSheet.specialAbilities);
          expect(response.data.changes.new.specialAbilities).toStrictEqual([
            ...character.characterSheet.specialAbilities,
            "Reroll",
          ]);
        } else {
          expect(response.data.changes.new.specialAbilities).toBeUndefined();
        }

        expect(response.historyRecord).not.toBeNull();

        const historyRecord = response.historyRecord as PostLevelUpHistoryRecord;

        expect(historyRecord.type).toBe(HistoryRecordType.LEVEL_UP_APPLIED);
        expect(historyRecord.name).toBe("Level " + nextLevel);
        expect(historyRecord.number).toBeGreaterThan(0);
        expect(historyRecord.id).toBeDefined();
        expect(historyRecord.timestamp).toBeDefined();
        expect(historyRecord.learningMethod).toBeNull();

        expect(historyRecord.data.old).toStrictEqual(response.data.changes.old);
        expect(historyRecord.data.new).toStrictEqual(response.data.changes.new);

        expect(historyRecord.calculationPoints.adventurePoints).toBeNull();
        expect(historyRecord.calculationPoints.attributePoints).toBeNull();

        expect(historyRecord.comment).toBeNull();
      });
    });
  });
});
