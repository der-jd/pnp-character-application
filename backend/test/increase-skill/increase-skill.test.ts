import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { Character, getSkill } from "config/index.js";
import { increaseSkill } from "increase-skill/index.js";
import { expectHttpError } from "../utils.js";

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
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          initialValue: 16,
          increasedPoints: 1,
          learningMethod: "NORMAL",
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
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          initialValue: 16,
          increasedPoints: 1,
          learningMethod: "NORMAL",
        },
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
      const fakeResponse = structuredClone(fakeCharacterResponse);
      fakeResponse.Item.characterSheet.calculationPoints.adventurePoints.available = 3;
      mockDynamoDBGetCharacterResponse(fakeResponse);

      await expectHttpError(() => increaseSkill(_case.request), _case.expectedStatusCode);
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
        queryStringParameters: null,
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
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await increaseSkill(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.skillName).toBe(_case.request.pathParameters["skill-name"]);
      expect(parsedBody.skill.new.current).toBe(_case.request.body.initialValue + _case.request.body.increasedPoints);

      const skillCategory = _case.request.pathParameters[
        "skill-category"
      ] as keyof Character["characterSheet"]["skills"];
      const skillName = _case.request.pathParameters["skill-name"];
      const skillOld = getSkill(fakeCharacterResponse.Item.characterSheet.skills, skillCategory, skillName);
      const oldTotalSkillCost = skillOld.totalCost;
      const diffSkillTotalCost = parsedBody.skill.new.totalCost - oldTotalSkillCost;
      const oldAvailableAdventurePoints =
        fakeCharacterResponse.Item.characterSheet.calculationPoints.adventurePoints.available;
      const diffAvailableAdventurePoints = oldAvailableAdventurePoints - parsedBody.adventurePoints.new.available;
      expect(diffAvailableAdventurePoints).toBe(diffSkillTotalCost);

      expect(parsedBody.skill.old).toStrictEqual(skillOld);

      // Skill was not already at the target value
      if (_case.request.body.initialValue + _case.request.body.increasedPoints !== skillOld.current) {
        // Check if the skill was updated
        const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
        expect(calls).toHaveLength(1);

        const matchingCall = calls.find((call: any) => {
          const input = call.args[0].input;
          return (
            input.Key.characterId === _case.request.pathParameters["character-id"] && input.Key.userId === fakeUserId
          );
        });
        expect(matchingCall).toBeTruthy();
      }

      // TODO add a check for all test across all Lambdas to validate the response body against the corresponding API schema (zod)
    });
  });
});
