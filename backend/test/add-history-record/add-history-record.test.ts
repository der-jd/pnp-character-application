import { describe, expect, test } from "vitest";
import { UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { CostCategory, RecordType } from "config/index.js";
import { addRecordToHistory, HistoryBodySchema } from "add-history-record/index.js";
import { fakeUserId } from "../test-data/request.js";
import {
  fakeHistoryBlockListResponse,
  fakeBigHistoryBlockListResponse,
  fakeCharacterResponse,
  fakeEmptyListResponse,
  mockDynamoDBGetCharacterResponse,
  mockDynamoDBQueryHistoryResponse,
} from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { fakeBigHistoryBlock, fakeHistoryBlock2 } from "../test-data/history.js";
import { expectHttpError } from "../utils.js";

const testBody: HistoryBodySchema = {
  userId: fakeUserId,
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
  learningMethod: null,
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
      name: "Add history record for 'event calculation points' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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
    {
      name: "Add history record for 'event level up' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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
      name: "Add history record for 'event base value' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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
      name: "Add history record for 'profession changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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
      name: "Add history record for 'hobby changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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
      name: "Add history record for 'advantage changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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
      name: "Add history record for 'disadvantage changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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
      name: "Add history record for 'special ability changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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
      name: "Add history record for 'attribute raised' to existing block",
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
      name: "Add history record for 'skill activated' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.SKILL_ACTIVATED,
          name: "social/acting",
          data: {
            old: {
              value: false,
            },
            new: {
              value: true,
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
                available: 40,
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
      name: "Add history record for 'skill raised' to existing block",
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
      name: "Add history record for 'combat values changed' to existing block",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.COMBAT_VALUES_CHANGED,
          name: "melee/slashingWeaponsSharp1h",
          data: {
            old: {
              availablePoints: 10,
              attackValue: 108,
              paradeValue: 78,
            },
            new: {
              availablePoints: 2,
              attackValue: 110,
              paradeValue: 84,
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

      const parsedBody = JSON.parse(result.body);
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

  const idempotencyTestCasesForExistingHistoryBlock = [
    {
      name: "Add a redundant history record to existing block (idempotency)",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
          type: RecordType.SKILL_CHANGED,
          name: "body/athletics",
          data: {
            old: {
              skill: {
                activated: true,
                start: 12,
                current: 16,
                mod: 4,
                totalCost: 40,
                defaultCostCategory: CostCategory.CAT_2,
              },
            },
            new: {
              skill: {
                activated: true,
                start: 14,
                current: 20,
                mod: 5,
                totalCost: 44,
                defaultCostCategory: CostCategory.CAT_2,
              },
            },
          },
          learningMethod: "NORMAL",
          calculationPoints: {
            adventurePoints: {
              old: {
                start: 0,
                available: 100,
                total: 200,
              },
              new: {
                start: 0,
                available: 96,
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
  ];

  idempotencyTestCasesForExistingHistoryBlock.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      const result = await addRecordToHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.type).toBe(_case.request.body.type);
      expect(parsedBody.name).toBe(_case.request.body.name);
      expect(parsedBody.number).toBe(fakeHistoryBlock2.changes[fakeHistoryBlock2.changes.length - 1].number);
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
      name: "Add history record for 'event calculation points' to new history",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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

      const parsedBody = JSON.parse(result.body);
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
      name: "Add history record for 'event calculation points' to new block in existing history",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userId: fakeUserId,
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

      const parsedBody = JSON.parse(result.body);
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
