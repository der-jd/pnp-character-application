import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { Character, getCombatValues } from "config/index.js";
import { expectHttpError } from "../utils.js";
import { _updateCombatValues } from "update-combat-values/index.js";

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
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 8,
          },
          new: {
            attackValue: 13,
            paradeValue: 10,
          },
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
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 8,
          },
          new: {
            attackValue: 13,
            paradeValue: 10,
          },
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
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 8,
          },
          new: {
            attackValue: 13,
            paradeValue: 10,
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Passed initial skill value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 5,
            paradeValue: 3,
          },
          new: {
            attackValue: 7,
            paradeValue: 4,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Not enough points to increase the combat values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 8,
          },
          new: {
            attackValue: 60,
            paradeValue: 58,
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "No parade value allowed for ranged combat skills",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "ranged",
          "combat-skill-name": "firearmMedium",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 0,
          },
          new: {
            attackValue: 10,
            paradeValue: 2,
          },
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
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 8,
          },
          new: {
            attackValue: 13,
            paradeValue: 10,
          },
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
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 8,
          },
          new: {
            attackValue: 13,
            paradeValue: 10,
          },
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _updateCombatValues(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    {
      name: "Combat values already updated to target value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 7,
            paradeValue: 6,
          },
          new: {
            attackValue: 10,
            paradeValue: 8,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase attack value (melee combat skill)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 8,
          },
          new: {
            attackValue: 15,
            paradeValue: 8,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase parade value (melee combat skill)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 8,
          },
          new: {
            attackValue: 10,
            paradeValue: 12,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase all combat values (melee combat skill)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 8,
          },
          new: {
            attackValue: 15,
            paradeValue: 13,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase attack value (ranged combat skill)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "ranged",
          "combat-skill-name": "firearmMedium",
        },
        queryStringParameters: null,
        body: {
          old: {
            attackValue: 10,
            paradeValue: 0,
          },
          new: {
            attackValue: 20,
            paradeValue: 0,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateCombatValues(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.userId).toBe(fakeUserId);
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.combatCategory).toBe(_case.request.pathParameters["combat-category"]);
      const skillName = _case.request.pathParameters["combat-skill-name"];
      expect(parsedBody.combatSkillName).toBe(skillName);

      const combatCategory = _case.request.pathParameters[
        "combat-category"
      ] as keyof Character["characterSheet"]["combatValues"];
      const oldSkillCombatValues = getCombatValues(
        fakeCharacterResponse.Item.characterSheet.combatValues,
        combatCategory,
        skillName,
      );
      expect(parsedBody.combatValues.old).toStrictEqual(oldSkillCombatValues);
      expect(parsedBody.combatValues.new).toStrictEqual(_case.request.body.new);

      // Skill was not already at the target value
      if (JSON.stringify(parsedBody.combatValues.new) !== JSON.stringify(parsedBody.combatValues.old)) {
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
    });
  });
});
