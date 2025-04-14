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
import { RecordType } from "config/index.js";

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
  learningMethod: undefined,
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
      name: "Add history record for event 'calculation points' to existing block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: testBody,
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
