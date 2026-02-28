import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders } from "./test-data/request.js";
import { fakeCharacter, fakeCharacterId } from "./test-data/character.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "./test-data/response.js";
import {
  applyLevelUpResponseSchema,
  BaseValues,
  LEVEL_UP_DICE_EXPRESSION,
  type Character,
  type PostLevelUpRequest,
} from "api-spec";
import { _applyLevelUp } from "apply-level-up";
import { expectHttpError } from "./utils.js";
import { computeLevelUpOptions, computeLevelUpOptionsHash } from "core";

const optionsHash = computeLevelUpOptionsHash(
  computeLevelUpOptions(
    fakeCharacter.characterSheet.generalInformation.level + 1,
    fakeCharacter.characterSheet.generalInformation.levelUpProgress
  )
);

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash: optionsHash,
          effect: {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          },
        },
      },
      expectedStatusCode: 401,
    },
    {
      name: "Authorization header is malformed",
      request: {
        headers: {
          authorization: "dummyValue",
        },
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash: optionsHash,
          effect: {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          },
        },
      },
      expectedStatusCode: 401,
    },
    {
      name: "Authorization token is invalid",
      request: {
        headers: {
          authorization: "Bearer 1234567890",
        },
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash: optionsHash,
          effect: {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          },
        },
      },
      expectedStatusCode: 401,
    },
    {
      name: "Initial level doesn't match the current level",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 4,
          optionsHash: optionsHash,
          effect: {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Options hash is stale",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash: "stale",
          effect: {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Hp roll has a value above the maximum",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash,
          effect: {
            kind: "hpRoll",
            roll: {
              dice: "1d4+2",
              value: 7,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Hp roll has a value below the minimum",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash,
          effect: {
            kind: "hpRoll",
            roll: {
              dice: "1d4+2",
              value: 2,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Armor level roll has a value above the maximum",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash,
          effect: {
            kind: "armorLevelRoll",
            roll: {
              dice: "1d4+2",
              value: 7,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Armor level roll has a value below the minimum",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash,
          effect: {
            kind: "armorLevelRoll",
            roll: {
              dice: "1d4+2",
              value: 2,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Hp roll has an invalid dice expression",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash,
          effect: {
            kind: "hpRoll",
            roll: {
              dice: "1d6+1",
              value: 3,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Armor level roll has an invalid dice expression",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash,
          effect: {
            kind: "armorLevelRoll",
            roll: {
              dice: "1d6+1",
              value: 3,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    /**
     * The full set of invalid effects for the current level are tested in get-level-up.test.ts.
     * By passing the options hash in the body, we ensure that the options are not stale and follow the same logic.
     */
    {
      name: "Chosen effect is not allowed for the current level (legendaryActionPlusOne requires higher level)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash,
          effect: {
            kind: "legendaryActionPlusOne",
            delta: 1,
          },
        },
      },
      expectedStatusCode: 400,
    },
    /**
     * The full set of invalid effects for the current level are tested in get-level-up.test.ts.
     * By passing the options hash in the body, we ensure that the options are not stale and follow the same logic.
     */
    {
      name: "Chosen effect is not allowed for the current level (reroll already unlocked)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash,
          effect: {
            kind: "rerollUnlock",
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Character id is not an UUID",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "1234567890",
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash: optionsHash,
          effect: {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "No character found for a non existing character id",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "26c5d41d-cef1-455f-a341-b15d8a5b3967",
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash: optionsHash,
          effect: {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          },
        },
      },
      expectedStatusCode: 404,
    },
    {
      name: "No character found for a non existing user id",
      request: {
        headers: dummyHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          initialLevel: 5,
          optionsHash: optionsHash,
          effect: {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          },
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _applyLevelUp(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validRequests: Array<{
    name: string;
    effectFactory: () => PostLevelUpRequest["effect"];
    baseValueKey?: keyof BaseValues;
    expectedDelta?: number;
    prepareCharacter?: (character: Character) => void;
    expectSpecialAbilities?: boolean;
  }> = [
    {
      name: "hpRoll increases health points",
      effectFactory: () => ({ kind: "hpRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 } }),
      baseValueKey: "healthPoints",
      expectedDelta: 4,
    },
    {
      name: "armorLevelRoll increases armor level",
      effectFactory: () => ({ kind: "armorLevelRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 3 } }),
      baseValueKey: "armorLevel",
      expectedDelta: 3,
      prepareCharacter: (character) => {
        character.characterSheet.generalInformation.level = 7; // Avoid cooldown
      },
    },
    {
      name: "initiativePlusOne increases initiative base value",
      effectFactory: () => ({ kind: "initiativePlusOne", delta: 1 }),
      baseValueKey: "initiativeBaseValue",
      expectedDelta: 1,
    },
    {
      name: "luckPlusOne increases luck points",
      effectFactory: () => ({ kind: "luckPlusOne", delta: 1 }),
      baseValueKey: "luckPoints",
      expectedDelta: 1,
      prepareCharacter: (character) => {
        character.characterSheet.generalInformation.level = 8; // Avoid cooldown
      },
    },
    {
      name: "bonusActionPlusOne increases bonus actions",
      effectFactory: () => ({ kind: "bonusActionPlusOne", delta: 1 }),
      baseValueKey: "bonusActionsPerCombatRound",
      expectedDelta: 1,
    },
    {
      name: "legendaryActionPlusOne increases legendary actions",
      effectFactory: () => ({ kind: "legendaryActionPlusOne", delta: 1 }),
      baseValueKey: "legendaryActions",
      expectedDelta: 1,
      prepareCharacter: (character) => {
        character.characterSheet.generalInformation.level = 10; // Effect is not available before
      },
    },
    {
      name: "rerollUnlock adds special ability",
      effectFactory: () => ({ kind: "rerollUnlock" }),
      // Remove rerollUnlock as chosen effect. It is only available once
      prepareCharacter: (character) => {
        character.characterSheet.specialAbilities = character.characterSheet.specialAbilities.filter(
          (ability) => ability !== "Reroll"
        );

        const { levelUpProgress } = character.characterSheet.generalInformation;
        levelUpProgress.effectsByLevel = Object.fromEntries(
          Object.entries(levelUpProgress.effectsByLevel).filter(([, value]) => value.kind !== "rerollUnlock")
        );
        delete levelUpProgress.effects.rerollUnlock;
      },
      expectSpecialAbilities: true,
    },
  ];

  validRequests.forEach((testCase) => {
    test(testCase.name, async () => {
      const custom = structuredClone(fakeCharacter);
      testCase.prepareCharacter?.(custom);

      mockDynamoDBGetCharacterResponse({ Item: custom });

      const initialLevel = custom.characterSheet.generalInformation.level;
      const nextLevel = initialLevel + 1;
      const effect = testCase.effectFactory();
      const oldProgress = custom.characterSheet.generalInformation.levelUpProgress;
      const request = {
        headers: fakeHeaders,
        pathParameters: { "character-id": custom.characterId },
        queryStringParameters: null,
        body: {
          initialLevel,
          effect,
          optionsHash: computeLevelUpOptionsHash(computeLevelUpOptions(nextLevel, oldProgress)),
        },
      };

      const result = await _applyLevelUp(request);
      expect(result.statusCode).toBe(200);

      const parsed = applyLevelUpResponseSchema.parse(JSON.parse(result.body));

      expect(parsed.characterId).toBe(custom.characterId);
      expect(parsed.userId).toBe(custom.userId);
      expect(parsed.effectKind).toBe(effect.kind);

      expect(parsed.changes.old.level).toBe(initialLevel);
      expect(parsed.changes.new.level).toBe(nextLevel);

      expect(parsed.changes.old.levelUpProgress).toStrictEqual(oldProgress);
      const levelKey = String(nextLevel);
      const newProgress = parsed.changes.new.levelUpProgress;
      expect(newProgress.effectsByLevel).toStrictEqual({
        ...oldProgress.effectsByLevel,
        [levelKey]: effect,
      });
      expect(newProgress.effects[effect.kind]).toBeDefined();
      expect(newProgress.effects[effect.kind]!.selectionCount).toBe(
        (oldProgress.effects[effect.kind]?.selectionCount ?? 0) + 1
      );
      expect(newProgress.effects[effect.kind]!.firstChosenLevel).toBe(
        oldProgress.effects[effect.kind]?.firstChosenLevel ?? nextLevel
      );
      expect(newProgress.effects[effect.kind]!.lastChosenLevel).toBe(nextLevel);
      // Except for the effect that was just chosen, all other effects should be the same
      const newEffects = { ...newProgress.effects };
      delete newEffects[effect.kind];
      const oldEffects = { ...oldProgress.effects };
      delete oldEffects[effect.kind];
      expect(newEffects).toStrictEqual(oldEffects);

      if (testCase.baseValueKey && testCase.expectedDelta) {
        const baseValueName = testCase.baseValueKey;
        const oldBaseValue = custom.characterSheet.baseValues[baseValueName];
        expect(parsed.changes.old.baseValues?.[baseValueName]).toStrictEqual(oldBaseValue);
        expect(parsed.changes.new.baseValues?.[baseValueName]).toBeDefined();
        expect(parsed.changes.new.baseValues?.[baseValueName]).toStrictEqual({
          ...oldBaseValue,
          current: oldBaseValue.current + testCase.expectedDelta,
          byLvlUp: (oldBaseValue.byLvlUp ?? 0) + testCase.expectedDelta,
        });
      } else {
        expect(parsed.changes.new.baseValues).toBeUndefined();
      }

      if (testCase.expectSpecialAbilities) {
        expect(parsed.changes.old.specialAbilities).toStrictEqual(custom.characterSheet.specialAbilities);
        expect(parsed.changes.new.specialAbilities).toStrictEqual([
          ...custom.characterSheet.specialAbilities,
          "Reroll",
        ]);
      } else {
        expect(parsed.changes.new.specialAbilities).toBeUndefined();
      }

      const updateCalls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
      expect(updateCalls.length).toBeGreaterThanOrEqual(1);

      const levelUpdateCall = updateCalls.find((call: any) =>
        call.args[0].input.UpdateExpression.includes("#generalInformation.#level")
      );
      expect(levelUpdateCall).toBeDefined();
      expect(levelUpdateCall.args[0].input.ExpressionAttributeValues[":level"]).toBe(nextLevel);
      expect(levelUpdateCall.args[0].input.ExpressionAttributeValues[":progress"]).toStrictEqual(
        parsed.changes.new.levelUpProgress
      );

      if (testCase.baseValueKey) {
        const baseValueCall = updateCalls.find((call: any) =>
          call.args[0].input.UpdateExpression.includes("#characterSheet.#baseValues")
        );
        expect(baseValueCall).toBeDefined();
        expect(baseValueCall.args[0].input.ExpressionAttributeNames["#baseValueName"]).toBe(testCase.baseValueKey);
        expect(baseValueCall.args[0].input.ExpressionAttributeValues[":baseValue"]).toStrictEqual(
          parsed.changes.new.baseValues![testCase.baseValueKey]
        );
      }

      if (testCase.expectSpecialAbilities) {
        const specialAbilitiesCall = updateCalls.find((call: any) =>
          call.args[0].input.UpdateExpression.includes("#specialAbilities")
        );
        expect(specialAbilitiesCall).toBeDefined();
      }
    });
  });
});
