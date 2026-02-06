import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders } from "../test-data/request.js";
import { fakeCharacter, fakeCharacterId } from "../test-data/character.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import {
  applyLevelUpResponseSchema,
  LEVEL_UP_DICE_EXPRESSION,
  type Character,
  type PostLevelUpRequest,
} from "api-spec";
import { _applyLevelUp } from "apply-level-up";
import { expectHttpError } from "../utils.js";
import { computeLevelUpOptions, computeLevelUpOptionsHash } from "core";

const optionsHash = computeLevelUpOptionsHash(
  computeLevelUpOptions(
    fakeCharacter.characterSheet.generalInformation.level + 1,
    fakeCharacter.characterSheet.generalInformation.levelUpProgress,
  ),
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
      expectedStatusCode: 400,
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

function buildOptionsData(character: Character) {
  const nextLevel = character.characterSheet.generalInformation.level + 1;
  const options = computeLevelUpOptions(nextLevel, character.characterSheet.generalInformation.levelUpProgress);
  return {
    options,
    optionsHash: computeLevelUpOptionsHash(options),
  };
}

function buildValidBody(character: Character, effect: PostLevelUpRequest["effect"]) {
  const { optionsHash } = buildOptionsData(character);
  return {
    initialLevel: character.characterSheet.generalInformation.level,
    optionsHash,
    effect,
  } satisfies PostLevelUpRequest;
}

describe("POST /characters/{character-id}/level-up - Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: () => {
        const custom = structuredClone(fakeCharacter);
        return {
          headers: {},
          pathParameters: { "character-id": custom.characterId },
          queryStringParameters: null,
          body: buildValidBody(custom, {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          }),
        };
      },
      expectedStatusCode: 400,
    },
    {
      name: "Authorization header is malformed",
      request: () => {
        const custom = structuredClone(fakeCharacter);
        return {
          headers: { authorization: "dummyValue" },
          pathParameters: { "character-id": custom.characterId },
          queryStringParameters: null,
          body: buildValidBody(custom, {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          }),
        };
      },
      expectedStatusCode: 401,
    },
    {
      name: "Authorization token is invalid",
      request: () => {
        const custom = structuredClone(fakeCharacter);
        return {
          headers: { authorization: "Bearer 1234567890" },
          pathParameters: { "character-id": custom.characterId },
          queryStringParameters: null,
          body: buildValidBody(custom, {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          }),
        };
      },
      expectedStatusCode: 401,
    },
    {
      name: "Character id is not an UUID",
      request: () => {
        const custom = structuredClone(fakeCharacter);
        return {
          headers: fakeHeaders,
          pathParameters: { "character-id": "1234567890" },
          queryStringParameters: null,
          body: buildValidBody(custom, {
            kind: "hpRoll",
            roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
          }),
        };
      },
      expectedStatusCode: 400,
    },
    {
      name: "Effect payload is missing",
      request: () => {
        const custom = structuredClone(fakeCharacter);
        const { optionsHash } = buildOptionsData(custom);
        return {
          headers: fakeHeaders,
          pathParameters: { "character-id": custom.characterId },
          queryStringParameters: null,
          body: {
            initialLevel: custom.characterSheet.generalInformation.level,
            optionsHash,
          } as unknown as PostLevelUpRequest,
        };
      },
      expectedStatusCode: 400,
    },
    {
      name: "Dice roll value is out of range",
      request: () => {
        const custom = structuredClone(fakeCharacter);
        const { optionsHash } = buildOptionsData(custom);
        return {
          headers: fakeHeaders,
          pathParameters: { "character-id": custom.characterId },
          queryStringParameters: null,
          body: {
            initialLevel: custom.characterSheet.generalInformation.level,
            optionsHash,
            effect: {
              kind: "hpRoll",
              roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 10 },
            },
          } as unknown as PostLevelUpRequest,
        };
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      const request = _case.request();
      const custom = structuredClone(fakeCharacter);
      mockDynamoDBGetCharacterResponse({ Item: custom });

      await expectHttpError(() => _applyLevelUp(request), _case.expectedStatusCode);
    });
  });
});

describe("POST /characters/{character-id}/level-up - Business rule validation", () => {
  test("Initial level mismatch returns 409", async () => {
    const custom = structuredClone(fakeCharacter);
    const body = buildValidBody(custom, {
      kind: "hpRoll",
      roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
    });
    body.initialLevel = custom.characterSheet.generalInformation.level - 1;

    mockDynamoDBGetCharacterResponse({ Item: custom });

    await expectHttpError(
      () =>
        _applyLevelUp({
          headers: fakeHeaders,
          pathParameters: { "character-id": custom.characterId },
          queryStringParameters: null,
          body,
        }),
      409,
    );
  });

  test("Stale options hash returns 409", async () => {
    const custom = structuredClone(fakeCharacter);
    const body = buildValidBody(custom, {
      kind: "hpRoll",
      roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
    });
    body.optionsHash = "stale";

    mockDynamoDBGetCharacterResponse({ Item: custom });

    await expectHttpError(
      () =>
        _applyLevelUp({
          headers: fakeHeaders,
          pathParameters: { "character-id": custom.characterId },
          queryStringParameters: null,
          body,
        }),
      409,
    );
  });

  test("Selected effect is not allowed for the level", async () => {
    const custom = structuredClone(fakeCharacter);
    custom.characterSheet.generalInformation.level = 1;

    const { options, optionsHash } = buildOptionsData(custom);
    const matchingOption = options.find((option) => option.kind === "legendaryActionPlusOne");
    expect(matchingOption?.allowed).toBe(false);

    mockDynamoDBGetCharacterResponse({ Item: custom });

    await expectHttpError(
      () =>
        _applyLevelUp({
          headers: fakeHeaders,
          pathParameters: { "character-id": custom.characterId },
          queryStringParameters: null,
          body: {
            initialLevel: custom.characterSheet.generalInformation.level,
            optionsHash,
            effect: { kind: "legendaryActionPlusOne", delta: 1 },
          },
        }),
      400,
    );
  });

  test("No character found for the given character id", async () => {
    const custom = structuredClone(fakeCharacter);
    const body = buildValidBody(custom, {
      kind: "hpRoll",
      roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
    });

    mockDynamoDBGetCharacterResponse({ Item: custom });

    await expectHttpError(
      () =>
        _applyLevelUp({
          headers: fakeHeaders,
          pathParameters: { "character-id": "26c5d41d-cef1-455f-a341-b15d8a5b3967" },
          queryStringParameters: null,
          body,
        }),
      404,
    );
  });

  test("No character found for the authenticated user", async () => {
    const custom = structuredClone(fakeCharacter);
    const body = buildValidBody(custom, {
      kind: "hpRoll",
      roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 },
    });

    mockDynamoDBGetCharacterResponse({ Item: custom });

    await expectHttpError(
      () =>
        _applyLevelUp({
          headers: dummyHeaders,
          pathParameters: { "character-id": custom.characterId },
          queryStringParameters: null,
          body,
        }),
      404,
    );
  });
});

describe("POST /characters/{character-id}/level-up - Successful effects", () => {
  const successfulEffects: Array<{
    name: string;
    effectFactory: () => PostLevelUpRequest["effect"];
    baseValueKey?: keyof Character["characterSheet"]["baseValues"];
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
        character.characterSheet.generalInformation.level = 10;
      },
    },
    {
      name: "rerollUnlock adds special ability",
      effectFactory: () => ({ kind: "rerollUnlock" }),
      expectSpecialAbilities: true,
    },
  ];

  successfulEffects.forEach((testCase) => {
    test(testCase.name, async () => {
      const custom = structuredClone(fakeCharacter);
      testCase.prepareCharacter?.(custom);

      const effect = testCase.effectFactory();
      const { options, optionsHash } = buildOptionsData(custom);
      const option = options.find((opt) => opt.kind === effect.kind);
      expect(option).toBeDefined();
      expect(option?.allowed).toBe(true);

      mockDynamoDBGetCharacterResponse({ Item: custom });

      const originalLevel = custom.characterSheet.generalInformation.level;
      const request = {
        headers: fakeHeaders,
        pathParameters: { "character-id": custom.characterId },
        queryStringParameters: null,
        body: {
          initialLevel: originalLevel,
          optionsHash,
          effect,
        },
      };

      const result = await _applyLevelUp(request);
      expect(result.statusCode).toBe(200);

      const parsed = applyLevelUpResponseSchema.parse(JSON.parse(result.body));
      expect(parsed.characterId).toBe(custom.characterId);
      expect(parsed.userId).toBe(custom.userId);
      expect(parsed.effectKind).toBe(effect.kind);

      const nextLevel = originalLevel + 1;
      expect(parsed.changes.old.level).toBe(originalLevel);
      expect(parsed.changes.new.level).toBe(nextLevel);

      const levelKey = String(nextLevel);
      expect(parsed.changes.new.levelUpProgress.effectsByLevel[levelKey]).toStrictEqual(effect);

      const oldProgress = custom.characterSheet.generalInformation.levelUpProgress.effects[effect.kind];
      const newProgress = parsed.changes.new.levelUpProgress.effects[effect.kind];
      expect(newProgress).toBeDefined();
      expect(newProgress!.selectionCount).toBe((oldProgress?.selectionCount ?? 0) + 1);
      expect(newProgress!.lastChosenLevel).toBe(nextLevel);
      expect(newProgress!.firstChosenLevel).toBe(oldProgress?.firstChosenLevel ?? nextLevel);

      if (testCase.baseValueKey && testCase.expectedDelta !== undefined) {
        const baseValueName = testCase.baseValueKey;
        const oldBaseValue = custom.characterSheet.baseValues[baseValueName];
        const newBaseValue = parsed.changes.new.baseValues?.[baseValueName];
        expect(newBaseValue).toBeDefined();
        expect(parsed.changes.old.baseValues?.[baseValueName]).toStrictEqual(oldBaseValue);
        expect(newBaseValue?.current).toBe(oldBaseValue.current + testCase.expectedDelta);
        expect(newBaseValue?.byLvlUp).toBe((oldBaseValue.byLvlUp ?? 0) + testCase.expectedDelta);
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
      expect(updateCalls.length).toBe(testCase.expectSpecialAbilities ? 2 : testCase.baseValueKey ? 2 : 1);

      const levelUpdateCall = updateCalls.find((call: any) =>
        call.args[0].input.UpdateExpression.includes("#generalInformation.#level"),
      );
      expect(levelUpdateCall).toBeDefined();
      expect(levelUpdateCall.args[0].input.ExpressionAttributeValues[":level"]).toBe(nextLevel);
      expect(levelUpdateCall.args[0].input.ExpressionAttributeValues[":progress"]).toStrictEqual(
        parsed.changes.new.levelUpProgress,
      );

      if (testCase.baseValueKey) {
        const baseValueCall = updateCalls.find((call: any) =>
          call.args[0].input.UpdateExpression.includes("#characterSheet.#baseValues"),
        );
        expect(baseValueCall).toBeDefined();
        expect(baseValueCall.args[0].input.ExpressionAttributeNames["#baseValueName"]).toBe(testCase.baseValueKey);
      }

      if (testCase.expectSpecialAbilities) {
        const specialAbilitiesCall = updateCalls.find((call: any) =>
          call.args[0].input.UpdateExpression.includes("#specialAbilities"),
        );
        expect(specialAbilitiesCall).toBeDefined();
      }
    });
  });
});
