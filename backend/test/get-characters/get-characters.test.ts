import { describe, expect, test } from "vitest";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeMultipleCharactersResponse, mockDynamoDBQueryResponse } from "../test-data/response.js";
import { getCharacters } from "../../src/lambdas/get-characters/index.js";
import { Character } from "config/index.js";

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is malformed",
      request: {
        headers: {
          authorization: "dummyValue",
        },
        pathParameters: null,
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
        pathParameters: null,
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 401,
    },
    {
      name: "No character found for a non existing user id",
      request: {
        headers: dummyHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBQueryResponse(fakeMultipleCharactersResponse);

      const result = await getCharacters(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    {
      name: "Successfully get characters",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: null,
      },
      expectedStatusCode: 200,
    },
    {
      name: "Successfully get characters in short form",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: {
          "character-short": "true",
        },
        body: null,
      },
      expectedStatusCode: 200,
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBQueryResponse(fakeMultipleCharactersResponse);

      const result = await getCharacters(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.characters.length).toBe(fakeMultipleCharactersResponse.Items.length);

      // Check that all characters have the same userId as the input
      parsedBody.characters.forEach((character: Character) => {
        expect(character.userId).toBe(fakeUserId);
      });

      // Check that all characterIds from the fake response are included in the result
      const resultCharacterIds = parsedBody.characters.map((character: Character) => character.characterId);
      const fakeCharacterIds = fakeMultipleCharactersResponse.Items.map((item: Character) => item.characterId);
      expect(resultCharacterIds).toEqual(expect.arrayContaining(fakeCharacterIds));
    });
  });
});
