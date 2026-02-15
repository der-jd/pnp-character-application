import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import { fakeCharacter, fakeCharacterId } from "../test-data/character.js";
import { addSpecialAbilityResponseSchema } from "api-spec";
import { _addSpecialAbility } from "add-special-ability";
import { expectHttpError } from "../utils.js";
import { MAX_STRING_LENGTH_DEFAULT } from "api-spec";

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
        body: {
          specialAbility: "Iron Will",
        },
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
        body: {
          specialAbility: "Iron Will",
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
          specialAbility: "Iron Will",
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
          specialAbility: "Iron Will",
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
          specialAbility: "Iron Will",
        },
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
        body: {
          specialAbility: "Iron Will",
        },
      },
      expectedStatusCode: 404,
    },
    {
      name: "Special ability name exceeds max length",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          specialAbility: "Iron Will".repeat(MAX_STRING_LENGTH_DEFAULT + 1), // Exceeding the maximum length
        },
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _addSpecialAbility(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const idempotentTestCases = [
    {
      name: "Special ability has already been added (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          specialAbility: fakeCharacter.characterSheet.specialAbilities[0],
        },
      },
      expectedStatusCode: 200,
    },
  ];

  idempotentTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _addSpecialAbility(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = addSpecialAbilityResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.userId).toBe(fakeUserId);

      expect(parsedBody.specialAbilityName).toBe(_case.request.body.specialAbility);

      expect(parsedBody.specialAbilities.old.values).toEqual(fakeCharacter.characterSheet.specialAbilities);
      expect(parsedBody.specialAbilities.new).toStrictEqual(parsedBody.specialAbilities.old);
      expect(parsedBody.specialAbilities.new.values).toContain(parsedBody.specialAbilityName);
    });
  });

  const updateTestCases = [
    {
      name: "Add special ability",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          specialAbility: "Iron Will",
        },
      },
      expectedStatusCode: 200,
    },
  ];

  updateTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _addSpecialAbility(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = addSpecialAbilityResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.userId).toBe(fakeUserId);

      expect(parsedBody.specialAbilityName).toBe(_case.request.body.specialAbility);

      expect(parsedBody.specialAbilities.old.values).toEqual(fakeCharacter.characterSheet.specialAbilities);
      expect(parsedBody.specialAbilities.old.values).not.toContain(parsedBody.specialAbilityName);
      const newSpecialAbilities = [...parsedBody.specialAbilities.old.values, parsedBody.specialAbilityName];
      expect(parsedBody.specialAbilities.new.values).toStrictEqual(newSpecialAbilities);

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);

      // Special abilities are updated
      expect(calls.length).toBe(1);

      const matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Key.characterId === _case.request.pathParameters["character-id"] && input.Key.userId === fakeUserId
        );
      });
      expect(matchingCall).toBeTruthy();
    });
  });
});
