import { describe, expect, test } from "vitest";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeCharacterListResponse, mockDynamoDBQueryCharactersResponse } from "../test-data/response.js";
import { getCharacters } from "get-characters";
import { Character, characterSchema, characterShortSchema, getCharactersResponseSchema } from "api-spec";
import { expectHttpError } from "../utils.js";

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: {
        headers: {},
        pathParameters: null,
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
      mockDynamoDBQueryCharactersResponse(fakeCharacterListResponse);

      await expectHttpError(() => getCharacters(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  test("Successfully get characters - full response", async () => {
    mockDynamoDBQueryCharactersResponse(fakeCharacterListResponse);

    const result = await getCharacters({
      headers: fakeHeaders,
      pathParameters: null,
      queryStringParameters: null,
      body: null,
    });

    expect(result.statusCode).toBe(200);

    const parsedBody = getCharactersResponseSchema.parse(JSON.parse(result.body));
    expect(parsedBody.characters.length).toBe(fakeCharacterListResponse.Items.length);

    parsedBody.characters.forEach((character) => {
      // Check that the character schema is valid
      characterSchema.parse(character);
      // Check that all characters have the same userId as the input
      expect(character.userId).toBe(fakeUserId);
    });

    // Check that all characterIds from the fake response are included in the result
    const resultCharacterIds = parsedBody.characters.map((character) => character.characterId);
    const fakeCharacterIds = fakeCharacterListResponse.Items.map((item: Character) => item.characterId);
    expect(resultCharacterIds).toEqual(expect.arrayContaining(fakeCharacterIds));

    // Check that we can find a specific character by ID and it matches the full character schema
    const firstFakeCharacter = fakeCharacterListResponse.Items[0] as Character;
    const foundCharacter = parsedBody.characters.find((entry) => entry.characterId === firstFakeCharacter.characterId);
    expect(foundCharacter).toBeDefined();
    expect(foundCharacter).toStrictEqual(firstFakeCharacter);
  });

  test("Successfully get characters - short form", async () => {
    mockDynamoDBQueryCharactersResponse(fakeCharacterListResponse);

    const result = await getCharacters({
      headers: fakeHeaders,
      pathParameters: null,
      queryStringParameters: {
        "character-short": "true",
      },
      body: null,
    });

    expect(result.statusCode).toBe(200);

    const parsedBody = getCharactersResponseSchema.parse(JSON.parse(result.body));
    expect(parsedBody.characters.length).toBe(fakeCharacterListResponse.Items.length);

    parsedBody.characters.forEach((character) => {
      // Check that the character schema is valid
      characterShortSchema.parse(character);
      // Check that all characters have the same userId as the input
      expect(character.userId).toBe(fakeUserId);
    });

    // Check that we can find a specific character by ID
    const firstFakeCharacter = fakeCharacterListResponse.Items[0] as Character;
    const foundCharacter = parsedBody.characters.find((entry) => entry.characterId === firstFakeCharacter.characterId);
    expect(foundCharacter).toBeDefined();

    // Type narrowing - this should be characterShortSchema since we used "character-short": true
    if ("name" in foundCharacter!) {
      expect(foundCharacter!.name).toBe(firstFakeCharacter.characterSheet.generalInformation.name);
      expect(foundCharacter!.level).toBe(firstFakeCharacter.characterSheet.generalInformation.level);
    } else {
      throw new Error("Expected character short form but got full character form");
    }
  });
});
