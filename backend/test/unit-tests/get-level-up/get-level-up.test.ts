import { describe, expect, test } from "vitest";
import { fakeHeaders, dummyHeaders } from "../test-data/request.js";
import { fakeCharacter, fakeCharacterId } from "../test-data/character.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import {
  Character,
  getLevelUpResponseSchema,
  GetLevelUpResponse,
  LEVEL_UP_DICE_EXPRESSION,
  LevelUpEffectKind,
  LevelUpOption,
  MAX_LEVEL,
} from "api-spec";
import { _getLevelUp } from "get-level-up";
import { expectHttpError } from "../utils.js";
import { computeLevelUpOptionsHash } from "core";

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
        body: null,
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
        body: null,
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
        body: null,
      },
      expectedStatusCode: 401,
    },
    {
      name: "Character id is not an UUID",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "1234567890",
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 400,
    },
    {
      name: "No character found for a non existing user id",
      request: {
        headers: dummyHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _getLevelUp(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const executeGetLevelUp = async (character: Character): Promise<GetLevelUpResponse> => {
    mockDynamoDBGetCharacterResponse({ Item: character });
    const response = await _getLevelUp({
      headers: fakeHeaders,
      pathParameters: { "character-id": character.characterId },
      queryStringParameters: null,
      body: null,
    });

    expect(response.statusCode).toBe(200);
    return getLevelUpResponseSchema.parse(JSON.parse(response.body));
  };

  const expectOption = (parsed: GetLevelUpResponse, kind: LevelUpEffectKind): LevelUpOption => {
    const option = parsed.options.find((opt) => opt.kind === kind);
    expect(option).toBeTruthy();
    return option!;
  };

  test("returns all level-up options together with the options hash", async () => {
    const parsed = await executeGetLevelUp(fakeCharacter);

    expect(parsed.characterId).toBe(fakeCharacterId);
    expect(parsed.nextLevel).toBe(fakeCharacter.characterSheet.generalInformation.level + 1);
    expect(parsed.options.length).toBeGreaterThan(0);
    expect(parsed.optionsHash).toBe(computeLevelUpOptionsHash(parsed.options));
  });

  describe("allows level-up options when the requirements are satisfied", () => {
    const allowedCases: Array<{
      name: string;
      kind: LevelUpEffectKind;
      setup: (character: Character) => void;
      assert: (option: LevelUpOption) => void;
    }> = [
      {
        name: "hpRoll is available and exposes its dice expression",
        kind: "hpRoll",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 2;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "2": { kind: "hpRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 } },
            },
            effects: {
              hpRoll: {
                selectionCount: 1,
                firstChosenLevel: 2,
                lastChosenLevel: 2,
              },
            },
          };
        },
        assert: (option) => {
          expect(option.allowed).toBe(true);
          expect(option.firstLevel).toBe(2);
          expect(option.selectionCount).toBe(1);
          expect(option.maxSelectionCount).toBe(MAX_LEVEL - 1);
          expect(option.cooldownLevels).toBe(0);
          expect(option.reasonIfDenied).toBeUndefined();
          expect(option.diceExpression).toBe("1d4+2");
          expect(option.firstChosenLevel).toBe(2);
          expect(option.lastChosenLevel).toBe(2);
        },
      },
      {
        name: "armorLevelRoll is available after the cooldown passes",
        kind: "armorLevelRoll",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 10;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "4": { kind: "armorLevelRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 4 } },
              "7": { kind: "armorLevelRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 5 } },
            },
            effects: {
              armorLevelRoll: {
                selectionCount: 2,
                firstChosenLevel: 4,
                lastChosenLevel: 7,
              },
            },
          };
        },
        assert: (option) => {
          expect(option.allowed).toBe(true);
          expect(option.firstLevel).toBe(2);
          expect(option.selectionCount).toBe(2);
          expect(option.maxSelectionCount).toBe(MAX_LEVEL - 1);
          expect(option.cooldownLevels).toBe(2);
          expect(option.reasonIfDenied).toBeUndefined();
          expect(option.diceExpression).toBe("1d4+2");
          expect(option.firstChosenLevel).toBe(4);
          expect(option.lastChosenLevel).toBe(7);
        },
      },
      {
        name: "initiativePlusOne can be selected again after one level",
        kind: "initiativePlusOne",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 7;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "3": { kind: "initiativePlusOne", delta: 1 },
              "5": { kind: "initiativePlusOne", delta: 1 },
            },
            effects: {
              initiativePlusOne: {
                selectionCount: 2,
                firstChosenLevel: 3,
                lastChosenLevel: 5,
              },
            },
          };
        },
        assert: (option) => {
          expect(option.allowed).toBe(true);
          expect(option.firstLevel).toBe(2);
          expect(option.selectionCount).toBe(2);
          expect(option.maxSelectionCount).toBe(MAX_LEVEL - 1);
          expect(option.cooldownLevels).toBe(1);
          expect(option.reasonIfDenied).toBeUndefined();
          expect(option.diceExpression).toBeUndefined();
          expect(option.firstChosenLevel).toBe(3);
          expect(option.lastChosenLevel).toBe(5);
        },
      },
      {
        name: "luckPlusOne stays available until its third pick",
        kind: "luckPlusOne",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 8;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "4": { kind: "luckPlusOne", delta: 1 },
              "6": { kind: "luckPlusOne", delta: 1 },
            },
            effects: {
              luckPlusOne: {
                selectionCount: 2,
                firstChosenLevel: 4,
                lastChosenLevel: 6,
              },
            },
          };
        },
        assert: (option) => {
          expect(option.allowed).toBe(true);
          expect(option.firstLevel).toBe(2);
          expect(option.selectionCount).toBe(2);
          expect(option.maxSelectionCount).toBe(3);
          expect(option.cooldownLevels).toBe(2);
          expect(option.reasonIfDenied).toBeUndefined();
          expect(option.diceExpression).toBeUndefined();
          expect(option.firstChosenLevel).toBe(4);
          expect(option.lastChosenLevel).toBe(6);
        },
      },
      {
        name: "bonusActionPlusOne can be taken again long after the previous pick",
        kind: "bonusActionPlusOne",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 20;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "6": { kind: "bonusActionPlusOne", delta: 1 },
            },
            effects: {
              bonusActionPlusOne: {
                selectionCount: 1,
                firstChosenLevel: 6,
                lastChosenLevel: 6,
              },
            },
          };
        },
        assert: (option) => {
          expect(option.allowed).toBe(true);
          expect(option.firstLevel).toBe(6);
          expect(option.selectionCount).toBe(1);
          expect(option.maxSelectionCount).toBe(3);
          expect(option.cooldownLevels).toBe(9);
          expect(option.reasonIfDenied).toBeUndefined();
          expect(option.diceExpression).toBeUndefined();
          expect(option.firstChosenLevel).toBe(6);
          expect(option.lastChosenLevel).toBe(6);
        },
      },
      {
        name: "legendaryActionPlusOne unlocks once the character reaches the required level",
        kind: "legendaryActionPlusOne",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 20;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {},
            effects: {},
          };
        },
        assert: (option) => {
          expect(option.allowed).toBe(true);
          expect(option.firstLevel).toBe(11);
          expect(option.selectionCount).toBe(0);
          expect(option.maxSelectionCount).toBe(3);
          expect(option.cooldownLevels).toBe(9);
          expect(option.reasonIfDenied).toBeUndefined();
          expect(option.diceExpression).toBeUndefined();
          expect(option.firstChosenLevel).toBeUndefined();
          expect(option.lastChosenLevel).toBeUndefined();
        },
      },
      {
        name: "rerollUnlock is available while it has not been chosen yet",
        kind: "rerollUnlock",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 5;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {},
            effects: {},
          };
        },
        assert: (option) => {
          expect(option.allowed).toBe(true);
          expect(option.firstLevel).toBe(2);
          expect(option.selectionCount).toBe(0);
          expect(option.maxSelectionCount).toBe(1);
          expect(option.cooldownLevels).toBe(MAX_LEVEL);
          expect(option.reasonIfDenied).toBeUndefined();
          expect(option.diceExpression).toBeUndefined();
          expect(option.firstChosenLevel).toBeUndefined();
          expect(option.lastChosenLevel).toBeUndefined();
        },
      },
    ];

    test.each(allowedCases)("$name", async ({ kind, setup, assert }) => {
      const custom = structuredClone(fakeCharacter);
      setup(custom);

      const parsed = await executeGetLevelUp(custom);
      const option = expectOption(parsed, kind);
      assert(option);
    });
  });

  describe("denies options until the first allowed level is reached", () => {
    const firstLevelCases: Array<{
      name: string;
      kind: Extract<LevelUpEffectKind, "bonusActionPlusOne" | "legendaryActionPlusOne">;
      requiredLevel: number;
      setup: (character: Character) => void;
    }> = [
      {
        name: "bonusActionPlusOne remains blocked before level 6",
        kind: "bonusActionPlusOne",
        requiredLevel: 6,
        setup: (character) => {
          character.characterSheet.generalInformation.level = 4;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {},
            effects: {},
          };
        },
      },
      {
        name: "legendaryActionPlusOne remains blocked before level 11",
        kind: "legendaryActionPlusOne",
        requiredLevel: 11,
        setup: (character) => {
          character.characterSheet.generalInformation.level = 9;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {},
            effects: {},
          };
        },
      },
    ];

    test.each(firstLevelCases)("$name", async ({ kind, requiredLevel, setup }) => {
      const custom = structuredClone(fakeCharacter);
      setup(custom);

      const parsed = await executeGetLevelUp(custom);
      const option = expectOption(parsed, kind);

      expect(option.allowed).toBe(false);
      expect(option.firstLevel).toBe(requiredLevel);
      expect(option.selectionCount).toBe(0);
      expect(option.maxSelectionCount).toBe(3);
      expect(option.cooldownLevels).toBe(9);
      expect(option.reasonIfDenied).toBeDefined();
      expect(option.diceExpression).toBeUndefined();
      expect(option.firstChosenLevel).toBeUndefined();
      expect(option.lastChosenLevel).toBeUndefined();
    });
  });

  describe("denies options while the cooldown is still active", () => {
    const cooldownCases: Array<{
      name: string;
      kind: Exclude<LevelUpEffectKind, "hpRoll" | "rerollUnlock">;
      setup: (character: Character) => void;
    }> = [
      {
        name: "armorLevelRoll enforces its 2-level cooldown",
        kind: "armorLevelRoll",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 12;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "4": { kind: "armorLevelRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 3 } },
              "12": { kind: "armorLevelRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: 6 } },
            },
            effects: {
              armorLevelRoll: {
                selectionCount: 2,
                firstChosenLevel: 4,
                lastChosenLevel: 12,
              },
            },
          };
        },
      },
      {
        name: "initiativePlusOne cannot be taken in consecutive levels",
        kind: "initiativePlusOne",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 8;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "3": { kind: "initiativePlusOne", delta: 1 },
              "8": { kind: "initiativePlusOne", delta: 1 },
            },
            effects: {
              initiativePlusOne: {
                selectionCount: 2,
                firstChosenLevel: 3,
                lastChosenLevel: 8,
              },
            },
          };
        },
      },
      {
        name: "luckPlusOne enforces its 2-level cooldown",
        kind: "luckPlusOne",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 10;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "10": { kind: "luckPlusOne", delta: 1 },
            },
            effects: {
              luckPlusOne: {
                selectionCount: 1,
                firstChosenLevel: 10,
                lastChosenLevel: 10,
              },
            },
          };
        },
      },
      {
        name: "bonusActionPlusOne enforces its 9-level cooldown",
        kind: "bonusActionPlusOne",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 18;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "14": { kind: "bonusActionPlusOne", delta: 1 },
            },
            effects: {
              bonusActionPlusOne: {
                selectionCount: 1,
                firstChosenLevel: 14,
                lastChosenLevel: 14,
              },
            },
          };
        },
      },
      {
        name: "legendaryActionPlusOne enforces its 9-level cooldown",
        kind: "legendaryActionPlusOne",
        setup: (character) => {
          character.characterSheet.generalInformation.level = 18;
          character.characterSheet.generalInformation.levelUpProgress = {
            effectsByLevel: {
              "16": { kind: "legendaryActionPlusOne", delta: 1 },
            },
            effects: {
              legendaryActionPlusOne: {
                selectionCount: 1,
                firstChosenLevel: 16,
                lastChosenLevel: 16,
              },
            },
          };
        },
      },
    ];

    test.each(cooldownCases)("$name", async ({ kind, setup }) => {
      const custom = structuredClone(fakeCharacter);
      setup(custom);

      const parsed = await executeGetLevelUp(custom);
      const option = expectOption(parsed, kind);

      expect(option.allowed).toBe(false);
      expect(option.reasonIfDenied).toBeDefined();
    });
  });

  test("denies every option that already reached its max selection count", async () => {
    const custom = structuredClone(fakeCharacter);
    custom.characterSheet.generalInformation.level = 25;
    custom.characterSheet.generalInformation.levelUpProgress = {
      effectsByLevel: {
        "2": { kind: "luckPlusOne", delta: 1 },
        "3": { kind: "rerollUnlock" },
        "5": { kind: "luckPlusOne", delta: 1 },
        "6": { kind: "bonusActionPlusOne", delta: 1 },
        "8": { kind: "luckPlusOne", delta: 1 },
        "11": { kind: "legendaryActionPlusOne", delta: 1 },
        "16": { kind: "bonusActionPlusOne", delta: 1 },
        "21": { kind: "legendaryActionPlusOne", delta: 1 },
        "26": { kind: "bonusActionPlusOne", delta: 1 },
        "31": { kind: "legendaryActionPlusOne", delta: 1 },
      },
      effects: {
        luckPlusOne: {
          selectionCount: 3,
          firstChosenLevel: 2,
          lastChosenLevel: 8,
        },
        bonusActionPlusOne: {
          selectionCount: 3,
          firstChosenLevel: 6,
          lastChosenLevel: 26,
        },
        legendaryActionPlusOne: {
          selectionCount: 3,
          firstChosenLevel: 11,
          lastChosenLevel: 31,
        },
        rerollUnlock: {
          selectionCount: 1,
          firstChosenLevel: 3,
          lastChosenLevel: 3,
        },
      },
    };

    const parsed = await executeGetLevelUp(custom);

    const luck = expectOption(parsed, "luckPlusOne");
    expect(luck.allowed).toBe(false);
    expect(luck.reasonIfDenied).toBeDefined();

    const bonus = expectOption(parsed, "bonusActionPlusOne");
    expect(bonus.allowed).toBe(false);
    expect(bonus.reasonIfDenied).toBeDefined();

    const legendary = expectOption(parsed, "legendaryActionPlusOne");
    expect(legendary.allowed).toBe(false);
    expect(legendary.reasonIfDenied).toBeDefined();

    const reroll = expectOption(parsed, "rerollUnlock");
    expect(reroll.allowed).toBe(false);
    expect(reroll.reasonIfDenied).toBeDefined();
  });
});
