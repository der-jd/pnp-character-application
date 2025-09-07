import { describe, expect, test } from "vitest";
import { fakeHeaders, dummyHeaders, fakeUserId, dummyUserId } from "../test-data/request.js";
import {
  fakeCharacterResponse,
  fakeHistoryBlockListResponse,
  mockDynamoDBGetCharacterResponse,
  mockDynamoDBQueryHistoryResponse,
} from "../test-data/response.js";
import { fakeCharacter, fakeCharacterId } from "../test-data/character.js";
import { cloneCharacter } from "clone-character";
import { expectHttpError } from "../utils.js";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

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
        body: {
          userIdOfCharacter: fakeUserId,
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
          userIdOfCharacter: fakeUserId,
        },
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
        body: {
          userIdOfCharacter: fakeUserId,
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
          userIdOfCharacter: fakeUserId,
        },
      },
      expectedStatusCode: 404,
    },
    {
      name: "No character found for a non existing user id",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userIdOfCharacter: "99dea4f2-5507-4766-bdf8-aa0490c175a5",
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      await expectHttpError(() => cloneCharacter(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    {
      name: "Copy an own character",
      type: "own",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userIdOfCharacter: fakeUserId,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Copy another character",
      type: "other",
      request: {
        headers: dummyHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          userIdOfCharacter: fakeUserId,
        },
      },
      expectedStatusCode: 200,
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      const result = await cloneCharacter(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);

      switch (_case.type) {
        case "own":
          expect(parsedBody.userId).toBe(_case.request.body.userIdOfCharacter);
          expect(parsedBody.userId).toBe(fakeUserId);
          break;
        case "other":
          expect(parsedBody.userId).not.toBe(_case.request.body.userIdOfCharacter);
          expect(parsedBody.userId).toBe(dummyUserId);
          break;
        default:
          throw new Error(`Unknown case type: ${_case.type}`);
      }

      expect(parsedBody.characterId).not.toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.name).not.toBe(fakeCharacter.characterSheet.generalInformation.name);
      expect(parsedBody.name).toContain("Copy");
      expect(parsedBody.level).toBe(fakeCharacter.characterSheet.generalInformation.level);

      // Check if the character has been cloned
      const calls = (globalThis as any).dynamoDBMock.commandCalls(PutCommand);
      expect(calls).toHaveLength(1);

      const matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        // Expect characterSheet to be identical except for the name
        const expectedSheet = {
          ...fakeCharacter.characterSheet,
          generalInformation: { ...fakeCharacter.characterSheet.generalInformation, name: parsedBody.name },
        };
        return (
          input.Item.characterId === parsedBody.characterId &&
          input.Item.userId === parsedBody.userId &&
          expect(input.Item.characterSheet).toStrictEqual(expectedSheet)
        );
      });
      expect(matchingCall).toBeTruthy();
    });
  });
});
