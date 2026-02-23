import { describe, expect, test } from "vitest";
import { fakeHeaders, dummyHeaders } from "../test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { getSkillResponseSchema } from "api-spec";
import { getSkillCost } from "get-skill-increase-cost";
import { expectHttpError } from "../utils.js";

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "social",
          "skill-name": "knowledgeOfHumanNature",
        },
        queryStringParameters: {
          "learning-method": "NORMAL",
        },
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
          "skill-category": "social",
          "skill-name": "knowledgeOfHumanNature",
        },
        queryStringParameters: {
          "learning-method": "NORMAL",
        },
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
          "skill-category": "social",
          "skill-name": "knowledgeOfHumanNature",
        },
        queryStringParameters: {
          "learning-method": "NORMAL",
        },
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
          "skill-category": "social",
          "skill-name": "knowledgeOfHumanNature",
        },
        queryStringParameters: {
          "learning-method": "NORMAL",
        },
        body: null,
      },
      expectedStatusCode: 400,
    },
    {
      name: "No character found for a non existing character id",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "26c5d41d-cef1-455f-a341-b15d8a5b3967",
          "skill-category": "social",
          "skill-name": "knowledgeOfHumanNature",
        },
        queryStringParameters: {
          "learning-method": "NORMAL",
        },
        body: null,
      },
      expectedStatusCode: 404,
    },
    {
      name: "No character found for a non existing user id",
      request: {
        headers: dummyHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "social",
          "skill-name": "knowledgeOfHumanNature",
        },
        queryStringParameters: {
          "learning-method": "NORMAL",
        },
        body: null,
      },
      expectedStatusCode: 404,
    },
    {
      name: "Learning method query is missing",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "social",
          "skill-name": "knowledgeOfHumanNature",
        },
        queryStringParameters: {},
        body: null,
      },
      expectedStatusCode: 400,
    },
    {
      name: "Learning method query is invalid",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "social",
          "skill-name": "knowledgeOfHumanNature",
        },
        queryStringParameters: {
          "learning-method": "INVALID_METHOD",
        },
        body: null,
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => getSkillCost(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    // Test cases for default cost category '2'
    {
      name: "Get skill increase cost for 1 below 1st threshold; default cost category '2'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "social",
          "skill-name": "knowledgeOfHumanNature",
        },
        queryStringParameters: {}, // will be defined in the test,
        body: null,
      },
      expectedStatusCode: 200,
      expectedResults: [
        {
          learningMethod: "FREE",
          increaseCost: 0,
        },
        {
          learningMethod: "LOW_PRICED",
          increaseCost: 0.5,
        },
        {
          learningMethod: "NORMAL",
          increaseCost: 1,
        },
        {
          learningMethod: "EXPENSIVE",
          increaseCost: 2,
        },
      ],
    },
    {
      name: "Get skill increase cost for 1st threshold; default cost category '2'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "social",
          "skill-name": "streetKnowledge",
        },
        queryStringParameters: {}, // will be defined in the test,
        body: null,
      },
      expectedStatusCode: 200,
      expectedResults: [
        {
          learningMethod: "FREE",
          increaseCost: 0,
        },
        {
          learningMethod: "LOW_PRICED",
          increaseCost: 1,
        },
        {
          learningMethod: "NORMAL",
          increaseCost: 2,
        },
        {
          learningMethod: "EXPENSIVE",
          increaseCost: 3,
        },
      ],
    },
    {
      name: "Get skill increase cost for 1 below 2nd threshold; default cost category '2'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "social",
          "skill-name": "acting",
        },
        queryStringParameters: {}, // will be defined in the test,
        body: null,
      },
      expectedStatusCode: 200,
      expectedResults: [
        {
          learningMethod: "FREE",
          increaseCost: 0,
        },
        {
          learningMethod: "LOW_PRICED",
          increaseCost: 1,
        },
        {
          learningMethod: "NORMAL",
          increaseCost: 2,
        },
        {
          learningMethod: "EXPENSIVE",
          increaseCost: 3,
        },
      ],
    },
    {
      name: "Get skill increase cost for 2nd threshold; default cost category '2'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "social",
          "skill-name": "writtenExpression",
        },
        queryStringParameters: {}, // will be defined in the test,
        body: null,
      },
      expectedStatusCode: 200,
      expectedResults: [
        {
          learningMethod: "FREE",
          increaseCost: 0,
        },
        {
          learningMethod: "LOW_PRICED",
          increaseCost: 2,
        },
        {
          learningMethod: "NORMAL",
          increaseCost: 3,
        },
        {
          learningMethod: "EXPENSIVE",
          increaseCost: 4,
        },
      ],
    },
    // Test cases for default cost category '3'
    {
      name: "Get skill increase cost for 1 below 1st threshold; default cost category '3'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "combat",
          "skill-name": "thrustingWeapons2h",
        },
        queryStringParameters: {}, // will be defined in the test,
        body: null,
      },
      expectedStatusCode: 200,
      expectedResults: [
        {
          learningMethod: "FREE",
          increaseCost: 0,
        },
        {
          learningMethod: "LOW_PRICED",
          increaseCost: 1,
        },
        {
          learningMethod: "NORMAL",
          increaseCost: 2,
        },
        {
          learningMethod: "EXPENSIVE",
          increaseCost: 3,
        },
      ],
    },
    {
      name: "Get skill increase cost for 1st threshold; default cost category '3'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "combat",
          "skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: {}, // will be defined in the test,
        body: null,
      },
      expectedStatusCode: 200,
      expectedResults: [
        {
          learningMethod: "FREE",
          increaseCost: 0,
        },
        {
          learningMethod: "LOW_PRICED",
          increaseCost: 2,
        },
        {
          learningMethod: "NORMAL",
          increaseCost: 3,
        },
        {
          learningMethod: "EXPENSIVE",
          increaseCost: 4,
        },
      ],
    },
    {
      name: "Get skill increase cost for 1 below 2nd threshold; default cost category '3'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "combat",
          "skill-name": "barehanded",
        },
        queryStringParameters: {}, // will be defined in the test,
        body: null,
      },
      expectedStatusCode: 200,
      expectedResults: [
        {
          learningMethod: "FREE",
          increaseCost: 0,
        },
        {
          learningMethod: "LOW_PRICED",
          increaseCost: 2,
        },
        {
          learningMethod: "NORMAL",
          increaseCost: 3,
        },
        {
          learningMethod: "EXPENSIVE",
          increaseCost: 4,
        },
      ],
    },
    {
      name: "Get skill increase cost for 2nd threshold; default cost category '3'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "combat",
          "skill-name": "slashingWeaponsSharp2h",
        },
        queryStringParameters: {}, // will be defined in the test,
        body: null,
      },
      expectedStatusCode: 200,
      expectedResults: [
        {
          learningMethod: "FREE",
          increaseCost: 0,
        },
        {
          learningMethod: "LOW_PRICED",
          increaseCost: 3,
        },
        {
          learningMethod: "NORMAL",
          increaseCost: 4,
        },
        {
          learningMethod: "EXPENSIVE",
          increaseCost: 5,
        },
      ],
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      for (const r of _case.expectedResults) {
        _case.request.queryStringParameters = {
          "learning-method": r.learningMethod,
        };
        const result = await getSkillCost(_case.request);

        expect(result.statusCode).toBe(_case.expectedStatusCode);

        const parsedBody = getSkillResponseSchema.parse(JSON.parse(result.body));
        expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
        expect(parsedBody.skillName).toBe(_case.request.pathParameters["skill-name"]);
        expect(parsedBody.increaseCost).toBeCloseTo(r.increaseCost);
      }
    });
  });
});
