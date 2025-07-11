import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders } from "../test-data/request.js";
import {
  fakeHistoryBlockListResponse,
  mockDynamoDBQueryHistoryResponse,
  fakeHistoryBlockResponse,
  mockDynamoDBGetHistoryResponse,
} from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { expectHttpError } from "../utils.js";
import { setHistoryComment } from "set-history-comment/index.js";

const lastBlock = fakeHistoryBlockListResponse.Items[fakeHistoryBlockListResponse.Items.length - 1];
const fakeRecordId = lastBlock.changes[lastBlock.changes.length - 1].id;

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Character id is not an UUID",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "1234567890",
          "record-id": fakeRecordId,
        },
        queryStringParameters: null,
        body: {
          comment: "This is a test comment",
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Record id is not an UUID",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "1234567890",
        },
        queryStringParameters: null,
        body: {
          comment: "This is a test comment",
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Record id not in latest history block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "190b1c74-9dd9-4dee-b739-4c58dade9da8", // Random UUID
        },
        queryStringParameters: null,
        body: {
          comment: "This is a test comment",
        },
      },
      expectedStatusCode: 404,
    },
    {
      name: "History comment exceeds maximum length",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "f18003ae-a678-4273-b6be-e0f9bb6b023a",
        },
        queryStringParameters: null,
        body: {
          comment: "This is a test comment".repeat(1001), // Exceeding the maximum length
        },
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      await expectHttpError(() => setHistoryComment(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    {
      name: "Set comment for latest history block",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "to-be-replaced", // This will be replaced with the actual record id in the test
        },
        queryStringParameters: null,
        body: {
          comment: "This is a test comment",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Set comment for given history block number",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "record-id": "to-be-replaced", // This will be replaced with the actual record id in the test
        },
        queryStringParameters: {
          "block-number": `${lastBlock.blockNumber - 1}`,
        },
        body: {
          comment: "This is a test comment",
        },
      },
      expectedStatusCode: 200,
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetHistoryResponse(fakeHistoryBlockResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      let expectedBlockNumber: number;
      if (_case.request.queryStringParameters?.["block-number"]) {
        expectedBlockNumber = parseInt(_case.request.queryStringParameters["block-number"]);
        _case.request.pathParameters["record-id"] =
          fakeHistoryBlockResponse.Item.changes[fakeHistoryBlockResponse.Item.changes.length - 1].id;
      } else {
        expectedBlockNumber = lastBlock.blockNumber;
        _case.request.pathParameters["record-id"] = fakeRecordId;
      }

      const result = await setHistoryComment(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.blockNumber).toBe(expectedBlockNumber);
      expect(parsedBody.recordId).toBe(_case.request.pathParameters["record-id"]);
      expect(parsedBody.comment).toBe(_case.request.body.comment);

      // Check if the history item was updated
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
      expect(calls).toHaveLength(1);

      const matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Key.characterId === _case.request.pathParameters["character-id"] &&
          input.Key.blockNumber === expectedBlockNumber
        );
      });
      expect(matchingCall).toBeTruthy();
    });
  });
});
