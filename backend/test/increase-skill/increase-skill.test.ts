//import "aws-sdk-client-mock-jest/vitest";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

import { describe, expect, test } from "vitest";
import { increaseSkill } from "../../src/lambdas/increase-skill/index.js";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeDynamoDBCharacterResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";

/*expect(mockDynamoDBDocumentClient).toHaveBeenCalledBefore(PutCommand, {
  TableName: "TestUserTable",
  Item: userToCreate,
});*/

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is malformed",
      request: {
        headers: {
          authorization: "dummyValue",
        },
        pathParameters: null,
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
        body: null,
      },
      expectedStatusCode: 401,
    },
    {
      name: "Passed initial skill value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 10,
          increasedPoints: 15,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Skill is not activated",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        body: {
          initialValue: 8,
          increasedPoints: 3,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Not enough adventure points",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: 1000,
          learningMethod: "EXPENSIVE",
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Initial skill value is a string, not a number",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: "16",
          increasedPoints: 5,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Increased points is a string, not a number",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: "5",
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Character id is not an UUID",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "1234567890",
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: 5,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Increased points are 0",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: 0,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Increased points are negative",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: -3,
          learningMethod: "NORMAL",
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
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: 3,
          learningMethod: "NORMAL",
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
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: 3,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(`${_case.name}`, async () => {
      (globalThis as any).dynamoDBMock.on(GetCommand).callsFake((command) => {
        const key = command.Key;
        if (key.characterId === fakeCharacterId && key.userId === fakeUserId) {
          fakeDynamoDBCharacterResponse.Item.characterSheet.calculationPoints.adventurePoints.available = 3;
          return Promise.resolve(fakeDynamoDBCharacterResponse);
        } else {
          return Promise.resolve({ Item: undefined });
        }
      });

      const result = await increaseSkill(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);
    });
  });
});
