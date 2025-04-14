import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders } from "../test-data/request.js";
import {
  fakeMultipleHistoryItemsResponse,
  fakeSingleCharacterResponse,
  mockDynamoDBGetCharacterResponse,
  mockDynamoDBQueryHistoryResponse,
} from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { addRecordToHistory } from "add-history-record/index.js";
import { fakeHistoryBlock2 } from "../test-data/history.js";
import { CostCategory, RecordType } from "config/index.js";

const testBody = {
  type: RecordType.EVENT_CALCULATION_POINTS,
  name: "Adventure Points",
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
  calculationPointsChange: {
    adjustment: 20,
    old: 100,
    new: 120,
  },
  comment: "Epic fight against a big monster",
};

describe("Invalid requests", () => {
  const invalidTestCases = [
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
        body: testBody,
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
        body: testBody,
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
        body: testBody,
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
        body: testBody,
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
        body: testBody,
      },
      expectedStatusCode: 404,
    },
    {
      name: "Invalid record type",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
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
          calculationPointsChange: {
            adjustment: 20,
            old: 100,
            new: 120,
          },
          comment: "Epic fight against a big monster",
        },
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeSingleCharacterResponse);

      const result = await addRecordToHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    {
      name: "Add history record for 'event calculation points' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.EVENT_CALCULATION_POINTS,
          name: "Adventure Points",
          data: {
            old: {
              start: 0,
              available: 90,
              total: 100,
            },
            new: {
              start: 0,
              available: 110,
              total: 120,
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: 20,
            old: 90,
            new: 110,
          },
          comment: "Epic fight against a big monster",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'event level up' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.EVENT_LEVEL_UP,
          name: "Level 2",
          data: {
            old: {
              value: 1,
            },
            new: {
              value: 2,
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: 0,
            old: 0,
            new: 0,
          },
          comment: "Finished story arc",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'event base value' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.EVENT_BASE_VALUE,
          name: "health points",
          data: {
            old: {
              start: 20,
              current: 20,
              byLvlUp: 0,
              mod: 0,
              totalCost: 0,
            },
            new: {
              start: 20,
              current: 26,
              byLvlUp: 6,
              mod: 0,
              totalCost: 0,
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: 0,
            old: 110,
            new: 110,
          },
          comment: "Level 2",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'profession changed' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.PROFESSION_CHANGED,
          name: "Profession changed",
          data: {
            old: {
              name: "",
              skill: "",
            },
            new: {
              name: "Stonemason",
              skill: "stonework",
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: 0,
            old: 0,
            new: 0,
          },
          comment: undefined,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'hobby changed' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.HOBBY_CHANGED,
          name: "Hobby changed",
          data: {
            old: {
              name: "",
              skill: "",
            },
            new: {
              name: "Musician",
              skill: "makingMusic",
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: 0,
            old: 0,
            new: 0,
          },
          comment: undefined,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'advantage changed' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.ADVANTAGE_CHANGED,
          name: "Advantage changed",
          data: {
            old: {
              value: "",
            },
            new: {
              value: "Iron Will",
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: 0,
            old: 110,
            new: 110,
          },
          comment: undefined,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'disadvantage changed' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.DISADVANTAGE_CHANGED,
          name: "Disadvantage changed",
          data: {
            old: {
              value: "",
            },
            new: {
              value: "Short Temper",
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: 0,
            old: 110,
            new: 110,
          },
          comment: undefined,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'special ability changed' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.SPECIAL_ABILITY_CHANGED,
          name: "Special ability changed",
          data: {
            old: {
              value: "",
            },
            new: {
              value: "Berserker Rage",
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: 0,
            old: 110,
            new: 110,
          },
          comment: undefined,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'attribute raised' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.ATTRIBUTE_RAISED,
          name: "Courage",
          data: {
            old: {
              start: 0,
              current: 0,
              mod: 0,
              totalCost: 0,
            },
            new: {
              start: 0,
              current: 1,
              mod: 0,
              totalCost: 1,
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: -1,
            old: 9,
            new: 8,
          },
          comment: undefined,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'skill activated' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.SKILL_ACTIVATED,
          name: "Disguising",
          data: {
            old: {
              value: false,
            },
            new: {
              value: true,
            },
          },
          learningMethod: "NORMAL",
          calculationPointsChange: {
            adjustment: -50,
            old: 110,
            new: 60,
          },
          comment: undefined,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'skill raised' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.SKILL_RAISED,
          name: "Body Control",
          data: {
            old: {
              activated: true,
              start: 0,
              current: 30,
              mod: 0,
              totalCost: 30,
              defaultCostCategory: CostCategory.CAT_2,
            },
            new: {
              activated: true,
              start: 0,
              current: 35,
              mod: 0,
              totalCost: 35,
              defaultCostCategory: CostCategory.CAT_2,
            },
          },
          learningMethod: "NORMAL",
          calculationPointsChange: {
            adjustment: -5,
            old: 60,
            new: 55,
          },
          comment: undefined,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Add history record for 'attack/parade distributed' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: RecordType.ATTACK_PARADE_DISTRIBUTED,
          name: "Slashing Weapons 1h",
          data: {
            old: {
              handling: 30,
              attackDistributed: 10,
              paradeDistributed: 10,
            },
            new: {
              handling: 30,
              attackDistributed: 16,
              paradeDistributed: 12,
            },
          },
          learningMethod: undefined,
          calculationPointsChange: {
            adjustment: 0,
            old: 0,
            new: 0,
          },
          comment: undefined,
        },
      },
      expectedStatusCode: 200,
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeSingleCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeMultipleHistoryItemsResponse);

      const result = await addRecordToHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.type).toBe(_case.request.body.type);
      expect(parsedBody.name).toBe(_case.request.body.name);
      expect(parsedBody.number).toBe(fakeHistoryBlock2.changes[fakeHistoryBlock2.changes.length - 1].number + 1);
      expect(parsedBody.id).toBeDefined();
      expect(parsedBody.data.old).toEqual(_case.request.body.data.old);
      expect(parsedBody.data.new).toEqual(_case.request.body.data.new);
      expect(parsedBody.learningMethod).toBe(_case.request.body.learningMethod);
      expect(parsedBody.calculationPointsChange).toEqual(_case.request.body.calculationPointsChange);
      expect(parsedBody.comment).toBe(_case.request.body.comment);
      expect(parsedBody.timestamp).toBeDefined();

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
});
