import { describe, expect, test } from "vitest";
import { fakeHeaders, dummyHeaders } from "../test-data/request.js";
import { fakeSingleCharacterResponse, mockDynamoDBGetResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { addRecordToHistory } from "add-history-record/index.js";

const testBody = {
  type: "EVENT_CALCULATION_POINTS",
  name: "Epic battle",
  data: {
    old: {
      start: 0,
      available: 0,
      total: 100,
    },
    new: {
      start: 0,
      available: 20,
      total: 120,
    },
  },
  calculationPointsChange: {
    adjustment: 20,
    old: 100,
    new: 120,
  },
  comment: "Epic fight against a big monster",
};

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
        body: testBody,
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
        body: testBody,
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
        body: testBody,
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
        body: testBody,
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
        body: testBody,
      },
      expectedStatusCode: 404,
    },
    {
      name: "Invalid record type",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          type: "Invalid type",
          name: "Epic battle",
          data: {
            old: {
              start: 0,
              available: 0,
              total: 100,
            },
            new: {
              start: 0,
              available: 20,
              total: 120,
            },
          },
          calculationPointsChange: {
            adjustment: 20,
            old: 100,
            new: 120,
          },
          comment: "Epic fight against a big monster",
        },
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      const fakeResponse = structuredClone(fakeSingleCharacterResponse);
      fakeResponse.Item.characterSheet.calculationPoints.adventurePoints.available = 3;
      mockDynamoDBGetResponse(fakeResponse);

      const result = await addRecordToHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);
    });
  });
});

// TODO fix following tests

/*describe("Valid requests", () => {
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
      mockDynamoDBGetResponse(fakeSingleCharacterResponse);

      const result = await addRecordToHistory(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.skillName).toBe(_case.request.pathParameters["skill-name"]);
      expect(parsedBody.skillValue).toBe(_case.request.body.initialValue + _case.request.body.increasedPoints);

      const skillCategory = _case.request.pathParameters[
        "skill-category"
      ] as keyof Character["characterSheet"]["skills"];
      const skillName = _case.request.pathParameters["skill-name"];
      const skill = getSkill(fakeSingleCharacterResponse.Item.characterSheet.skills, skillCategory, skillName);
      const oldTotalSkillCost = skill.totalCost;
      const diffSkillTotalCost = parsedBody.totalCost - oldTotalSkillCost;
      const oldAvailableAdventurePoints =
        fakeSingleCharacterResponse.Item.characterSheet.calculationPoints.adventurePoints.available;
      const diffAvailableAdventurePoints = oldAvailableAdventurePoints - parsedBody.availableAdventurePoints;
      expect(diffAvailableAdventurePoints).toBe(diffSkillTotalCost);

      // Skill was not already at the target value
      if (_case.request.body.initialValue + _case.request.body.increasedPoints !== skill.current) {
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
});*/
