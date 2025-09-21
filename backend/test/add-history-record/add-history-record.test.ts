import { describe, expect, test } from "vitest";
import { UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { CostCategory, RecordType } from "api-spec";
import { addRecordToHistory, AddHistoryRecordRequest, addHistoryRecordResponseSchema } from "add-history-record";
import { fakeUserId } from "../test-data/request.js";
import {
  fakeHistoryBlockListResponse,
  fakeBigHistoryBlockListResponse,
  fakeCharacterResponse,
  fakeEmptyListResponse,
  mockDynamoDBGetCharacterResponse,
  mockDynamoDBQueryHistoryResponse,
} from "../test-data/response.js";
import { fakeCharacter, fakeCharacterId } from "../test-data/character.js";
import { fakeBigHistoryBlock, fakeHistoryBlock2 } from "../test-data/history.js";
import { expectHttpError } from "../utils.js";

const testBody: AddHistoryRecordRequest = {
  userId: fakeUserId,
  type: RecordType.CALCULATION_POINTS_CHANGED,
  name: "Calculation Points",
  data: {
    old: {
      adventurePoints: {
        start: 0,
        available: 0,
        total: 100,
      },
    },
    new: {
      adventurePoints: {
        start: 0,
        available: 20,
        total: 120,
      },
    },
  },
  learningMethod: null,
  calculationPoints: {
    adventurePoints: {
      old: {
        start: 0,
        available: 0,
        total: 100,
      },
      new: {
        start: 0,
        available: 20,
        total: 120,
      },
    },
    attributePoints: null,
  },
  comment: "Epic fight against a big monster",
};

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Character id is not an UUID",
      request: {
        headers: {},
        pathParameters: {
          "character-id": "1234567890",
        },
        queryStringParameters: null,
        body: testBody,
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid record type",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: "Invalid type",
          name: "Epic battle",
          data: {
            old: {
              start: 0,
              available: 0,
              total: 100,
            },
            new: {
              start: 0,
              available: 20,
              total: 120,
            },
          },
          calculationPoints: {
            adventurePoints: {
              old: {
                start: 0,
                available: 100,
                total: 200,
              },
              new: {
                start: 0,
                available: 120,
                total: 220,
              },
            },
            attributePoints: null,
          },
          comment: "Epic fight against a big monster",
        },
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => addRecordToHistory(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const testCasesForExistingHistoryBlock = [
    {
      name: "Add history record for 'character created' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.CHARACTER_CREATED,
          name: "New Character",
          data: {
            new: {
              character: fakeCharacter,
              generationPoints: {
                throughDisadvantages: 15,
                spent: 20,
                total: 20,
              },
              activatedSkills: [
                "body/pickpocketing",
                "body/bodyControl",
                "social/convincing",
                "nature/fishing",
                "handcraft/stonework",
              ],
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: null,
            attributePoints: null,
          },
          comment: null,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'calculation points changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.CALCULATION_POINTS_CHANGED,
          name: "Calculation Points",
          data: {
            old: {
              adventurePoints: {
                start: 0,
                available: 90,
                total: 100,
              },
              attributePoints: {
                start: 10,
                available: 0,
                total: 15,
              },
            },
            new: {
              adventurePoints: {
                start: 0,
                available: 110,
                total: 120,
              },
              attributePoints: {
                start: 10,
                available: 10,
                total: 25,
              },
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: {
              old: {
                start: 0,
                available: 90,
                total: 200,
              },
              new: {
                start: 0,
                available: 110,
                total: 220,
              },
            },
            attributePoints: {
              old: {
                start: 10,
                available: 0,
                total: 15,
              },
              new: {
                start: 10,
                available: 10,
                total: 25,
              },
            },
          },
          comment: "Epic fight against a big monster",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'level changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.LEVEL_CHANGED,
          name: "Level 2",
          data: {
            old: {
              value: 1,
            },
            new: {
              value: 2,
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: null,
            attributePoints: null,
          },
          comment: "Finished story arc",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'base value changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.BASE_VALUE_CHANGED,
          name: "health points",
          data: {
            old: {
              start: 20,
              current: 20,
              byLvlUp: 0,
              mod: 0,
            },
            new: {
              start: 20,
              current: 26,
              byLvlUp: 6,
              mod: 0,
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: null,
            attributePoints: null,
          },
          comment: "Level 2",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'special abilities changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.SPECIAL_ABILITIES_CHANGED,
          name: "Berserker Rage",
          data: {
            old: {
              values: ["Berserker Rage", "Battle Cry"],
            },
            new: {
              values: ["Berserker Rage", "Battle Cry", "Iron Will"],
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: null,
            attributePoints: null,
          },
          comment: null,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'attribute changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.ATTRIBUTE_CHANGED,
          name: "charisma",
          data: {
            old: {
              attribute: {
                start: 0,
                current: 0,
                mod: 0,
                totalCost: 0,
              },
            },
            new: {
              attribute: {
                start: 0,
                current: 1,
                mod: 0,
                totalCost: 1,
              },
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: null,
            attributePoints: {
              old: {
                start: 0,
                available: 9,
                total: 15,
              },
              new: {
                start: 0,
                available: 8,
                total: 15,
              },
            },
          },
          comment: null,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'attribute changed' (including base values) to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.ATTRIBUTE_CHANGED,
          name: "strength",
          data: {
            old: {
              attribute: {
                start: 17,
                current: 18,
                mod: 1,
                totalCost: 15,
              },
              baseValues: {
                healthPoints: {
                  start: 40,
                  current: 100,
                  byFormula: 77,
                  byLvlUp: 23,
                  mod: 10,
                },
                attackBaseValue: {
                  start: 30,
                  current: 110,
                  byFormula: 110,
                  mod: 0,
                },
                paradeBaseValue: {
                  start: 30,
                  current: 112,
                  byFormula: 112,
                  mod: 0,
                },
                rangedAttackBaseValue: {
                  start: 25,
                  current: 108,
                  byFormula: 108,
                  mod: 0,
                },
              },
            },
            new: {
              attribute: {
                start: 17,
                current: 20,
                mod: 1,
                totalCost: 17,
              },
              baseValues: {
                healthPoints: {
                  start: 40,
                  current: 102,
                  byFormula: 79,
                  byLvlUp: 23,
                  mod: 10,
                },
                attackBaseValue: {
                  start: 30,
                  current: 114,
                  byFormula: 114,
                  mod: 0,
                },
                paradeBaseValue: {
                  start: 30,
                  current: 116,
                  byFormula: 116,
                  mod: 0,
                },
                rangedAttackBaseValue: {
                  start: 25,
                  current: 112,
                  byFormula: 112,
                  mod: 0,
                },
              },
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: null,
            attributePoints: {
              old: {
                start: 0,
                available: 10,
                total: 10,
              },
              new: {
                start: 0,
                available: 8,
                total: 10,
              },
            },
          },
          comment: "Weight training",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'attribute changed' (including base values and combat stats) to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.ATTRIBUTE_CHANGED,
          name: "strength",
          data: {
            old: {
              attribute: {
                start: 17,
                current: 18,
                mod: 1,
                totalCost: 15,
              },
              baseValues: {
                healthPoints: {
                  start: 40,
                  current: 100,
                  byFormula: 77,
                  byLvlUp: 23,
                  mod: 10,
                },
                attackBaseValue: {
                  start: 30,
                  current: 110,
                  byFormula: 110,
                  mod: 0,
                },
                paradeBaseValue: {
                  start: 30,
                  current: 112,
                  byFormula: 112,
                  mod: 0,
                },
                rangedAttackBaseValue: {
                  start: 25,
                  current: 108,
                  byFormula: 108,
                  mod: 0,
                },
              },
              combat: {
                melee: {
                  martialArts: {
                    availablePoints: 19,
                    handling: 25,
                    attackValue: 116,
                    skilledAttackValue: 6,
                    paradeValue: 118,
                    skilledParadeValue: 6,
                  },
                  barehanded: {
                    availablePoints: 82,
                    handling: 25,
                    attackValue: 120,
                    skilledAttackValue: 10,
                    paradeValue: 120,
                    skilledParadeValue: 8,
                  },
                  chainWeapons: {
                    availablePoints: 26,
                    handling: 15,
                    attackValue: 120,
                    skilledAttackValue: 10,
                    paradeValue: 120,
                    skilledParadeValue: 8,
                  },
                  daggers: {
                    availablePoints: 26,
                    handling: 25,
                    attackValue: 120,
                    skilledAttackValue: 10,
                    paradeValue: 120,
                    skilledParadeValue: 8,
                  },
                  slashingWeaponsSharp1h: {
                    availablePoints: 10,
                    handling: 25,
                    attackValue: 218,
                    skilledAttackValue: 108,
                    paradeValue: 190,
                    skilledParadeValue: 78,
                  },
                  slashingWeaponsBlunt1h: {
                    availablePoints: 10,
                    handling: 25,
                    attackValue: 218,
                    skilledAttackValue: 108,
                    paradeValue: 190,
                    skilledParadeValue: 78,
                  },
                  thrustingWeapons1h: {
                    availablePoints: 58,
                    handling: 20,
                    attackValue: 120,
                    skilledAttackValue: 10,
                    paradeValue: 120,
                    skilledParadeValue: 8,
                  },
                  slashingWeaponsSharp2h: {
                    availablePoints: 83,
                    handling: 15,
                    attackValue: 120,
                    skilledAttackValue: 10,
                    paradeValue: 120,
                    skilledParadeValue: 8,
                  },
                  slashingWeaponsBlunt2h: {
                    availablePoints: 26,
                    handling: 15,
                    attackValue: 120,
                    skilledAttackValue: 10,
                    paradeValue: 120,
                    skilledParadeValue: 8,
                  },
                  thrustingWeapons2h: {
                    availablePoints: 57,
                    handling: 15,
                    attackValue: 120,
                    skilledAttackValue: 10,
                    paradeValue: 120,
                    skilledParadeValue: 8,
                  },
                },
                ranged: {
                  firearmSimple: {
                    availablePoints: 18,
                    handling: 30,
                    attackValue: 114,
                    skilledAttackValue: 6,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                  firearmMedium: {
                    availablePoints: 22,
                    handling: 20,
                    attackValue: 118,
                    skilledAttackValue: 10,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                  firearmComplex: {
                    availablePoints: 22,
                    handling: 10,
                    attackValue: 118,
                    skilledAttackValue: 10,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                  heavyWeapons: {
                    availablePoints: 22,
                    handling: 5,
                    attackValue: 118,
                    skilledAttackValue: 10,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                  missile: {
                    availablePoints: 15,
                    handling: 15,
                    attackValue: 113,
                    skilledAttackValue: 5,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                },
              },
            },
            new: {
              attribute: {
                start: 17,
                current: 20,
                mod: 1,
                totalCost: 17,
              },
              baseValues: {
                healthPoints: {
                  start: 40,
                  current: 102,
                  byFormula: 79,
                  byLvlUp: 23,
                  mod: 10,
                },
                attackBaseValue: {
                  start: 30,
                  current: 114,
                  byFormula: 114,
                  mod: 0,
                },
                paradeBaseValue: {
                  start: 30,
                  current: 116,
                  byFormula: 116,
                  mod: 0,
                },
                rangedAttackBaseValue: {
                  start: 25,
                  current: 112,
                  byFormula: 112,
                  mod: 0,
                },
              },
              combat: {
                melee: {
                  martialArts: {
                    availablePoints: 19,
                    handling: 25,
                    attackValue: 120,
                    skilledAttackValue: 6,
                    paradeValue: 122,
                    skilledParadeValue: 6,
                  },
                  barehanded: {
                    availablePoints: 82,
                    handling: 25,
                    attackValue: 124,
                    skilledAttackValue: 10,
                    paradeValue: 124,
                    skilledParadeValue: 8,
                  },
                  chainWeapons: {
                    availablePoints: 26,
                    handling: 15,
                    attackValue: 124,
                    skilledAttackValue: 10,
                    paradeValue: 124,
                    skilledParadeValue: 8,
                  },
                  daggers: {
                    availablePoints: 26,
                    handling: 25,
                    attackValue: 124,
                    skilledAttackValue: 10,
                    paradeValue: 124,
                    skilledParadeValue: 8,
                  },
                  slashingWeaponsSharp1h: {
                    availablePoints: 10,
                    handling: 25,
                    attackValue: 222,
                    skilledAttackValue: 108,
                    paradeValue: 194,
                    skilledParadeValue: 78,
                  },
                  slashingWeaponsBlunt1h: {
                    availablePoints: 10,
                    handling: 25,
                    attackValue: 222,
                    skilledAttackValue: 108,
                    paradeValue: 194,
                    skilledParadeValue: 78,
                  },
                  thrustingWeapons1h: {
                    availablePoints: 58,
                    handling: 20,
                    attackValue: 124,
                    skilledAttackValue: 10,
                    paradeValue: 124,
                    skilledParadeValue: 8,
                  },
                  slashingWeaponsSharp2h: {
                    availablePoints: 83,
                    handling: 15,
                    attackValue: 124,
                    skilledAttackValue: 10,
                    paradeValue: 124,
                    skilledParadeValue: 8,
                  },
                  slashingWeaponsBlunt2h: {
                    availablePoints: 26,
                    handling: 15,
                    attackValue: 124,
                    skilledAttackValue: 10,
                    paradeValue: 124,
                    skilledParadeValue: 8,
                  },
                  thrustingWeapons2h: {
                    availablePoints: 57,
                    handling: 15,
                    attackValue: 124,
                    skilledAttackValue: 10,
                    paradeValue: 124,
                    skilledParadeValue: 8,
                  },
                },
                ranged: {
                  firearmSimple: {
                    availablePoints: 18,
                    handling: 30,
                    attackValue: 118,
                    skilledAttackValue: 6,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                  firearmMedium: {
                    availablePoints: 22,
                    handling: 20,
                    attackValue: 122,
                    skilledAttackValue: 10,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                  firearmComplex: {
                    availablePoints: 22,
                    handling: 10,
                    attackValue: 122,
                    skilledAttackValue: 10,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                  heavyWeapons: {
                    availablePoints: 22,
                    handling: 5,
                    attackValue: 122,
                    skilledAttackValue: 10,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                  missile: {
                    availablePoints: 15,
                    handling: 15,
                    attackValue: 117,
                    skilledAttackValue: 5,
                    paradeValue: 0,
                    skilledParadeValue: 0,
                  },
                },
              },
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: null,
            attributePoints: {
              old: {
                start: 0,
                available: 10,
                total: 10,
              },
              new: {
                start: 0,
                available: 8,
                total: 10,
              },
            },
          },
          comment: "Weight training",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'skill changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.SKILL_CHANGED,
          name: "body/bodyControl",
          data: {
            old: {
              skill: {
                activated: true,
                start: 0,
                current: 30,
                mod: 0,
                totalCost: 30,
                defaultCostCategory: CostCategory.CAT_2,
              },
            },
            new: {
              skill: {
                activated: true,
                start: 0,
                current: 35,
                mod: 0,
                totalCost: 35,
                defaultCostCategory: CostCategory.CAT_2,
              },
            },
          },
          learningMethod: "NORMAL",
          calculationPoints: {
            adventurePoints: {
              old: {
                start: 0,
                available: 90,
                total: 200,
              },
              new: {
                start: 0,
                available: 85,
                total: 200,
              },
            },
            attributePoints: null,
          },
          comment: null,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'skill changed' (including combat stats) to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.SKILL_CHANGED,
          name: "combat/martialArts",
          data: {
            old: {
              skill: {
                activated: true,
                start: 5,
                current: 12,
                mod: 7,
                totalCost: 30,
                defaultCostCategory: CostCategory.CAT_2,
              },
              combatStats: {
                availablePoints: 19,
                handling: 25,
                attackValue: 116,
                skilledAttackValue: 6,
                paradeValue: 118,
                skilledParadeValue: 6,
              },
            },
            new: {
              skill: {
                activated: true,
                start: 5,
                current: 17,
                mod: 7,
                totalCost: 35,
                defaultCostCategory: CostCategory.CAT_2,
              },
              combatStats: {
                availablePoints: 24,
                handling: 25,
                attackValue: 116,
                skilledAttackValue: 6,
                paradeValue: 118,
                skilledParadeValue: 6,
              },
            },
          },
          learningMethod: "NORMAL",
          calculationPoints: {
            adventurePoints: {
              old: {
                start: 100,
                available: 80,
                total: 300,
              },
              new: {
                start: 100,
                available: 75,
                total: 300,
              },
            },
            attributePoints: null,
          },
          comment: null,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'combat stats changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.COMBAT_STATS_CHANGED,
          name: "melee/slashingWeaponsSharp1h",
          data: {
            old: {
              availablePoints: 10,
              handling: 25,
              attackValue: 218,
              skilledAttackValue: 108,
              paradeValue: 190,
              skilledParadeValue: 78,
            },
            new: {
              availablePoints: 2,
              handling: 25,
              attackValue: 220,
              skilledAttackValue: 110,
              paradeValue: 196,
              skilledParadeValue: 84,
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: null,
            attributePoints: null,
          },
          comment: null,
        },
      },
      expectedStatusCode: 200,
    },
  ];

  testCasesForExistingHistoryBlock.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      const result = await addRecordToHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = addHistoryRecordResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.type).toBe(_case.request.body.type);
      expect(parsedBody.name).toBe(_case.request.body.name);
      expect(parsedBody.number).toBe(fakeHistoryBlock2.changes[fakeHistoryBlock2.changes.length - 1].number + 1);
      expect(parsedBody.id).toBeDefined();
      expect(parsedBody.data.old).toEqual(_case.request.body.data.old);
      expect(parsedBody.data.new).toEqual(_case.request.body.data.new);
      expect(parsedBody.learningMethod).toBe(_case.request.body.learningMethod);
      expect(parsedBody.calculationPoints).toEqual(_case.request.body.calculationPoints);
      expect(parsedBody.comment).toBe(_case.request.body.comment);
      expect(parsedBody.timestamp).toBeDefined();

      // Check if the history block was updated
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
      expect(calls).toHaveLength(1);

      const matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Key.characterId === _case.request.pathParameters["character-id"] &&
          input.Key.blockNumber === fakeHistoryBlock2.blockNumber
        );
      });
      expect(matchingCall).toBeTruthy();
    });
  });

  const latestHistoryBlock = fakeHistoryBlockListResponse.Items[fakeHistoryBlockListResponse.Items.length - 1];

  const idempotencyTestCasesForExistingHistoryBlock = [
    {
      name: "Add a redundant history record to existing block (idempotency)",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: (() => {
          const record = latestHistoryBlock.changes[latestHistoryBlock.changes.length - 1];
          const { type, name, data, learningMethod, calculationPoints, comment } = record;
          return { userId: fakeUserId, type, name, data, learningMethod, calculationPoints, comment };
        })(),
      },
      expectedStatusCode: 200,
    },
  ];

  idempotencyTestCasesForExistingHistoryBlock.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      const result = await addRecordToHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = addHistoryRecordResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.type).toBe(_case.request.body.type);
      expect(parsedBody.name).toBe(_case.request.body.name);
      expect(parsedBody.number).toBe(latestHistoryBlock.changes[latestHistoryBlock.changes.length - 1].number);
      expect(parsedBody.id).toBeDefined();
      expect(parsedBody.data.old).toEqual(_case.request.body.data.old);
      expect(parsedBody.data.new).toEqual(_case.request.body.data.new);
      expect(parsedBody.learningMethod).toBe(_case.request.body.learningMethod);
      expect(parsedBody.calculationPoints).toEqual(_case.request.body.calculationPoints);
      expect(parsedBody.comment).toBe(_case.request.body.comment);
      expect(parsedBody.timestamp).toBeDefined();
    });
  });

  const testCasesForNewHistory = [
    {
      name: "Add history record for 'calculation points changed' to new history",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.CALCULATION_POINTS_CHANGED,
          name: "Calculation Points",
          data: {
            old: {
              adventurePoints: {
                start: 0,
                available: 90,
                total: 100,
              },
            },
            new: {
              adventurePoints: {
                start: 0,
                available: 110,
                total: 120,
              },
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: {
              old: {
                start: 0,
                available: 90,
                total: 200,
              },
              new: {
                start: 0,
                available: 110,
                total: 220,
              },
            },
            attributePoints: null,
          },
          comment: "Epic fight against a big monster",
        },
      },
      expectedStatusCode: 200,
    },
  ];

  testCasesForNewHistory.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeEmptyListResponse); // Mock a missing history

      const result = await addRecordToHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = addHistoryRecordResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.type).toBe(_case.request.body.type);
      expect(parsedBody.name).toBe(_case.request.body.name);
      expect(parsedBody.number).toBe(1); // first record in a newly created history
      expect(parsedBody.id).toBeDefined();
      expect(parsedBody.data.old).toEqual(_case.request.body.data.old);
      expect(parsedBody.data.new).toEqual(_case.request.body.data.new);
      expect(parsedBody.learningMethod).toBe(_case.request.body.learningMethod);
      expect(parsedBody.calculationPoints).toEqual(_case.request.body.calculationPoints);
      expect(parsedBody.comment).toBe(_case.request.body.comment);
      expect(parsedBody.timestamp).toBeDefined();

      // Check if the first history block was created
      let calls = (globalThis as any).dynamoDBMock.commandCalls(PutCommand);
      expect(calls).toHaveLength(1);

      let matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Item.characterId === _case.request.pathParameters["character-id"] &&
          input.Item.blockNumber === 1 &&
          input.Item.previousBlockId === null &&
          input.Item.changes.length === 0
        );
      });
      expect(matchingCall).toBeTruthy();

      // Check if the history block was updated
      calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
      expect(calls).toHaveLength(1);

      matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return input.Key.characterId === _case.request.pathParameters["character-id"] && input.Key.blockNumber === 1;
      });
      expect(matchingCall).toBeTruthy();
    });
  });

  const testCasesForNewHistoryBlockInExistingHistory = [
    {
      name: "Add history record for 'calculation points changed' to new block in existing history",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.CALCULATION_POINTS_CHANGED,
          name: "Calculation Points",
          data: {
            old: {
              adventurePoints: {
                start: 0,
                available: 90,
                total: 100,
              },
            },
            new: {
              adventurePoints: {
                start: 0,
                available: 110,
                total: 120,
              },
            },
          },
          learningMethod: null,
          calculationPoints: {
            adventurePoints: {
              old: {
                start: 0,
                available: 90,
                total: 200,
              },
              new: {
                start: 0,
                available: 110,
                total: 220,
              },
            },
            attributePoints: null,
          },
          comment: "Epic fight against a big monster",
        },
      },
      expectedStatusCode: 200,
    },
  ];

  testCasesForNewHistoryBlockInExistingHistory.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeBigHistoryBlockListResponse);

      const result = await addRecordToHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = addHistoryRecordResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.type).toBe(_case.request.body.type);
      expect(parsedBody.name).toBe(_case.request.body.name);
      expect(parsedBody.number).toBe(fakeBigHistoryBlock.changes[fakeBigHistoryBlock.changes.length - 1].number + 1);
      expect(parsedBody.id).toBeDefined();
      expect(parsedBody.data.old).toEqual(_case.request.body.data.old);
      expect(parsedBody.data.new).toEqual(_case.request.body.data.new);
      expect(parsedBody.learningMethod).toBe(_case.request.body.learningMethod);
      expect(parsedBody.calculationPoints).toEqual(_case.request.body.calculationPoints);
      expect(parsedBody.comment).toBe(_case.request.body.comment);
      expect(parsedBody.timestamp).toBeDefined();

      // Check if a new history block was created
      let calls = (globalThis as any).dynamoDBMock.commandCalls(PutCommand);
      expect(calls).toHaveLength(1);

      let matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Item.characterId === _case.request.pathParameters["character-id"] &&
          input.Item.blockNumber === fakeBigHistoryBlock.blockNumber + 1 &&
          input.Item.previousBlockId === fakeBigHistoryBlock.blockId &&
          input.Item.changes.length === 0
        );
      });
      expect(matchingCall).toBeTruthy();

      // Check if the history block was updated
      calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
      expect(calls).toHaveLength(1);

      matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Key.characterId === _case.request.pathParameters["character-id"] &&
          input.Key.blockNumber === fakeBigHistoryBlock.blockNumber + 1
        );
      });
      expect(matchingCall).toBeTruthy();
    });
  });
});
