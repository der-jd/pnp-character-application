import { describe, expect, test } from "vitest";
import {
  fakeHistoryBlockResponse,
  fakeHistoryBlockListResponse,
  fakeCharacterResponse,
  mockDynamoDBQueryHistoryResponse,
  mockDynamoDBGetCharacterResponse,
  mockDynamoDBGetCharacterAndHistoryResponse,
} from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { fakeHeaders, dummyHeaders } from "../test-data/request.js";
import { getHistory } from "get-history";
import { HistoryBlock, getHistoryResponseSchema } from "api-spec";
import { expectHttpError } from "../utils.js";

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
      name: "No history found for a non existing character id",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "26c5d41d-cef1-455f-a341-b15d8a5b3967",
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 404,
    },
    {
      name: "No character found for a non existing user id or user is not allowed to access the character",
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
    {
      name: "Invalid block number query - non-numeric",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: {
          "block-number": "abc",
        },
        body: null,
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid block number query - negative",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: {
          "block-number": "-1",
        },
        body: null,
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid block number query - zero",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: {
          "block-number": "0",
        },
        body: null,
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid block number query - too large",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: {
          "block-number": "100001",
        },
        body: null,
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      await expectHttpError(() => getHistory(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    {
      name: "Successfully get history",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 200,
    },
    {
      name: "Successfully get a specific history item",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: {
          "block-number": "1",
        },
        body: null,
      },
      expectedStatusCode: 200,
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterAndHistoryResponse(fakeCharacterResponse, fakeHistoryBlockResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      const result = await getHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = getHistoryResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.items.length).toBe(1); // The Lambda function currently only returns one item with each call

      // Check that all history items have the same character id as the input
      parsedBody.items.forEach((historyBlock: HistoryBlock) => {
        expect(historyBlock.characterId).toBe(fakeCharacterId);
      });

      // Check the block number
      // If a block number is provided in the query string, check that the block number of the first item is equal to the provided block number
      if (_case.request.queryStringParameters?.["block-number"]) {
        expect(parsedBody.items[0].blockNumber).toBe(parseInt(_case.request.queryStringParameters["block-number"]));
      }
      // Otherwise, check that the block number of the first item is equal to the block number of the last item in the fakeHistoryBlockListResponse
      else {
        expect(parsedBody.items[0].blockNumber).toBe(
          fakeHistoryBlockListResponse.Items[fakeHistoryBlockListResponse.Items.length - 1].blockNumber,
        );
      }

      // Initial history block has no previous block
      if (parsedBody.items[parsedBody.items.length - 1].blockNumber === 1) {
        expect(parsedBody.previousBlockNumber).toBeNull();
        expect(parsedBody.previousBlockId).toBeNull();
      }
      // Check that the previous block number is equal to the block number of the last item minus 1
      else {
        expect(parsedBody.previousBlockNumber).toBe(parsedBody.items[parsedBody.items.length - 1].blockNumber - 1);
      }
    });
  });
});
