import { describe, expect, test } from "vitest";
import { increaseSkill } from "../../src/lambdas/increase-skill/index.js";
import { fakeHeaders, dummyHeaders } from "../test-data/request.js";
import { fakeDynamoDBCharacterResponse, mockDynamoDBGetResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { Character, getSkill } from "config/index.js";

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
          "skill-category": "combat",
          "skill-name": "slashingWeapons1h",
        },
        body: {
          initialValue: 110,
          increasedPoints: 5,
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
    test(_case.name, async () => {
      const fakeResponse = structuredClone(fakeDynamoDBCharacterResponse);
      fakeResponse.Item.characterSheet.calculationPoints.adventurePoints.available = 3;
      mockDynamoDBGetResponse(fakeResponse);

      const result = await increaseSkill(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    {
      name: "Skill has already been increased to the target value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 12,
          increasedPoints: 4,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase skill by 1 point (cost category: NORMAL)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: 1,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase skill by 3 point (cost category: FREE)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: 3,
          learningMethod: "FREE",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase skill by 3 point (cost category: LOW_PRICED)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: 3,
          learningMethod: "LOW_PRICED",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase skill by 3 point (cost category: EXPENSIVE)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        body: {
          initialValue: 16,
          increasedPoints: 3,
          learningMethod: "EXPENSIVE",
        },
      },
      expectedStatusCode: 200,
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetResponse(fakeDynamoDBCharacterResponse);

      const result = await increaseSkill(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.skillValue).toBe(_case.request.body.initialValue + _case.request.body.increasedPoints);

      const skillCategory = _case.request.pathParameters["skill-category"] as keyof Character["characterSheet"]["skills"];
      const skillName = _case.request.pathParameters["skill-name"];
      const oldTotalSkillCost = getSkill(fakeDynamoDBCharacterResponse.Item.characterSheet.skills, skillCategory, skillName).totalCost;
      const diffSkillTotalCost = parsedBody.totalCost - oldTotalSkillCost;
      const oldAvailableAdventurePoints =
        fakeDynamoDBCharacterResponse.Item.characterSheet.calculationPoints.adventurePoints.available;
      const diffAvailableAdventurePoints = oldAvailableAdventurePoints - parsedBody.availableAdventurePoints;
      expect(diffAvailableAdventurePoints).toBe(diffSkillTotalCost);
    });
  });
});
