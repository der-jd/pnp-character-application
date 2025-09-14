import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { getCombatCategory, getCombatValues, getSkill } from "core";
import { Character, updateSkillResponseSchema } from "api-spec";
import { _updateSkill, availableCombatPointsChanged } from "update-skill";
import { expectHttpError } from "../utils.js";

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 16,
            increasedPoints: 1,
          },
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 400,
    },
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
          current: {
            initialValue: 16,
            increasedPoints: 1,
          },
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
          current: {
            initialValue: 16,
            increasedPoints: 1,
          },
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 401,
    },
    {
      name: "Activating a skill without a learning method",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        queryStringParameters: null,
        body: {
          activated: true,
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Deactivating a skill is not allowed",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          activated: false,
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Passed initial start skill value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 5,
            newValue: 8,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Passed initial current skill value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 10,
            increasedPoints: 15,
          },
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Passed initial mod value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 7,
            newValue: 10,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Skill is not activated (start value updated)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 5,
            newValue: 6,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Skill is not activated (current value updated)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 8,
            increasedPoints: 1,
          },
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Skill is not activated (mod value updated)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 3,
            newValue: 5,
          },
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
          "skill-name": "slashingWeaponsSharp1h",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 120,
            increasedPoints: 25,
          },
          learningMethod: "EXPENSIVE",
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
          current: {
            initialValue: 16,
            increasedPoints: 1,
          },
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
          current: {
            initialValue: 16,
            increasedPoints: 0,
          },
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
          current: {
            initialValue: 16,
            increasedPoints: -3,
          },
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
          current: {
            initialValue: 16,
            increasedPoints: 1,
          },
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
          current: {
            initialValue: 16,
            increasedPoints: 1,
          },
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _updateSkill(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const idempotentTestCases = [
    {
      name: "Skill already activated (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          activated: true,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Skill has already been updated to the target start value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 9,
            newValue: 12,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Skill has already been increased to the target current value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 12,
            increasedPoints: 4,
          },
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Skill has already been updated to the target mod value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 2,
            newValue: 4,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  idempotentTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateSkill(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateSkillResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      const skillCategory = _case.request.pathParameters[
        "skill-category"
      ] as keyof Character["characterSheet"]["skills"];
      expect(parsedBody.skillCategory).toBe(skillCategory);
      const skillName = _case.request.pathParameters["skill-name"];
      expect(parsedBody.skillName).toBe(skillName);

      if (_case.request.body.activated) {
        expect(parsedBody.changes.new.skill.activated).toBe(_case.request.body.activated);
        expect(parsedBody.learningMethod).toBe(_case.request.body.learningMethod);
      }

      if (_case.request.body.start) {
        expect(parsedBody.changes.new.skill.start).toBe(_case.request.body.start.newValue);
      }

      if (_case.request.body.current) {
        expect(parsedBody.changes.new.skill.current).toBe(
          _case.request.body.current.initialValue + _case.request.body.current.increasedPoints,
        );
        expect(parsedBody.learningMethod).toBe(_case.request.body.learningMethod);
      }

      if (_case.request.body.mod) {
        expect(parsedBody.changes.new.skill.mod).toBe(_case.request.body.mod.newValue);
      }

      const skillOld = getSkill(fakeCharacterResponse.Item.characterSheet.skills, skillCategory, skillName);
      expect(parsedBody.changes.old.skill).toStrictEqual(skillOld);
      expect(parsedBody.changes.new.skill).toStrictEqual(parsedBody.changes.old.skill);

      const oldAvailableAdventurePoints =
        fakeCharacterResponse.Item.characterSheet.calculationPoints.adventurePoints.available;
      const diffAvailableAdventurePoints = oldAvailableAdventurePoints - parsedBody.adventurePoints.new.available;
      expect(diffAvailableAdventurePoints).toBeCloseTo(0);

      const oldTotalSkillCost = skillOld.totalCost;
      const diffSkillTotalCost = parsedBody.changes.new.skill.totalCost - oldTotalSkillCost;
      expect(diffAvailableAdventurePoints).toBeCloseTo(diffSkillTotalCost);

      expect(parsedBody.combatCategory).toBeUndefined();
      expect(parsedBody.changes.old.combatValues).toBeUndefined();
      expect(parsedBody.changes.new.combatValues).toBeUndefined();
    });
  });

  const updateTestCases = [
    {
      name: "Activate skill (cost category: FREE)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        queryStringParameters: null,
        body: {
          activated: true,
          learningMethod: "FREE",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Activate skill (cost category: LOW_PRICED)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        queryStringParameters: null,
        body: {
          activated: true,
          learningMethod: "LOW_PRICED",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Activate skill (cost category: NORMAL)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        queryStringParameters: null,
        body: {
          activated: true,
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Activate skill (cost category: EXPENSIVE)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        queryStringParameters: null,
        body: {
          activated: true,
          learningMethod: "EXPENSIVE",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update start skill value",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 12,
            newValue: 15,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase current skill value by 1 point (cost category: NORMAL)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 16,
            increasedPoints: 1,
          },
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase current skill value by 3 point (cost category: FREE)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 16,
            increasedPoints: 3,
          },
          learningMethod: "FREE",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase current skill value by 3 point (cost category: LOW_PRICED)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 16,
            increasedPoints: 3,
          },
          learningMethod: "LOW_PRICED",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase current skill value by 3 point (cost category: EXPENSIVE)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 16,
            increasedPoints: 3,
          },
          learningMethod: "EXPENSIVE",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update mod value",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "body",
          "skill-name": "athletics",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 4,
            newValue: 7,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update all skill values (activated, start, current, mod)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "nature",
          "skill-name": "fishing",
        },
        queryStringParameters: null,
        body: {
          activated: true,
          start: {
            initialValue: 5,
            newValue: 7,
          },
          current: {
            initialValue: 8,
            increasedPoints: 1,
          },
          mod: {
            initialValue: 3,
            newValue: 6,
          },
          learningMethod: "NORMAL",
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update combat skill values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "skill-category": "combat",
          "skill-name": "slashingWeaponsSharp1h",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 120,
            increasedPoints: 10,
          },
          mod: {
            initialValue: 58,
            newValue: 65,
          },
          learningMethod: "FREE", // 'FREE' so that there is no interference with the other test cases that are checked against the adventure points
        },
      },
      expectedStatusCode: 200,
    },
  ];

  updateTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateSkill(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateSkillResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      const skillCategory = _case.request.pathParameters[
        "skill-category"
      ] as keyof Character["characterSheet"]["skills"];
      expect(parsedBody.skillCategory).toBe(skillCategory);
      const skillName = _case.request.pathParameters["skill-name"];
      expect(parsedBody.skillName).toBe(skillName);

      const oldAvailableAdventurePoints =
        fakeCharacterResponse.Item.characterSheet.calculationPoints.adventurePoints.available;
      const diffAvailableAdventurePoints = oldAvailableAdventurePoints - parsedBody.adventurePoints.new.available;

      if (_case.request.body.activated) {
        expect(parsedBody.changes.new.skill.activated).toBe(_case.request.body.activated);
        expect(parsedBody.learningMethod).toBe(_case.request.body.learningMethod);

        if (!_case.request.body.current) {
          switch (_case.request.body.learningMethod) {
            case "FREE":
              expect(diffAvailableAdventurePoints).toBeCloseTo(0);
              break;
            case "LOW_PRICED":
              expect(diffAvailableAdventurePoints).toBeCloseTo(40);
              break;
            case "NORMAL":
              expect(diffAvailableAdventurePoints).toBeCloseTo(50);
              break;
            case "EXPENSIVE":
              expect(diffAvailableAdventurePoints).toBeCloseTo(60);
              break;
            default:
              throw new Error(`Unknown learning method: ${_case.request.body.learningMethod}`);
          }
        }
      }

      if (_case.request.body.start) {
        expect(parsedBody.changes.new.skill.start).toBe(_case.request.body.start.newValue);
      }

      if (_case.request.body.current) {
        expect(parsedBody.changes.new.skill.current).toBe(
          _case.request.body.current.initialValue + _case.request.body.current.increasedPoints,
        );
        expect(parsedBody.learningMethod).toBe(_case.request.body.learningMethod);

        switch (_case.request.body.learningMethod) {
          case "FREE":
            expect(diffAvailableAdventurePoints).toBeCloseTo(0);
            break;
          case "LOW_PRICED":
            if (_case.request.body.activated) expect(diffAvailableAdventurePoints).toBeCloseTo(41.5);
            else expect(diffAvailableAdventurePoints).toBeCloseTo(1.5);
            break;
          case "NORMAL":
            if (_case.request.body.activated) expect(diffAvailableAdventurePoints).toBeCloseTo(51);
            else expect(diffAvailableAdventurePoints).toBeCloseTo(1);
            break;
          case "EXPENSIVE":
            if (_case.request.body.activated) expect(diffAvailableAdventurePoints).toBeCloseTo(66);
            else expect(diffAvailableAdventurePoints).toBeCloseTo(6);
            break;
          default:
            throw new Error(`Unknown learning method: ${_case.request.body.learningMethod}`);
        }
      }

      if (_case.request.body.mod) {
        expect(parsedBody.changes.new.skill.mod).toBe(_case.request.body.mod.newValue);
      }

      const skillOld = getSkill(fakeCharacterResponse.Item.characterSheet.skills, skillCategory, skillName);
      const oldTotalSkillCost = skillOld.totalCost;
      const diffSkillTotalCost = parsedBody.changes.new.skill.totalCost - oldTotalSkillCost;
      expect(diffAvailableAdventurePoints).toBeCloseTo(diffSkillTotalCost);

      expect(parsedBody.changes.old.skill).toStrictEqual(skillOld);

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);

      // Skill and combat values are updated
      if (availableCombatPointsChanged(parsedBody.changes.old.skill, parsedBody.changes.new.skill, skillCategory)) {
        expect(calls.length).toBe(2);

        expect(parsedBody.changes.old.combatValues).toBeDefined();
        expect(parsedBody.changes.new.combatValues).toBeDefined();

        const combatCategory = getCombatCategory(fakeCharacterResponse.Item.characterSheet.combatValues, skillName);
        expect(parsedBody.combatCategory).toBe(combatCategory);

        const skillCombatValuesOld = getCombatValues(
          fakeCharacterResponse.Item.characterSheet.combatValues,
          combatCategory,
          skillName,
        );
        expect(parsedBody.changes.old.combatValues).toStrictEqual(skillCombatValuesOld);
        expect(parsedBody.changes.new.combatValues?.attackValue).toBe(skillCombatValuesOld.attackValue);
        expect(parsedBody.changes.new.combatValues?.paradeValue).toBe(skillCombatValuesOld.paradeValue);

        const availableCombatPointsNew =
          skillCombatValuesOld.availablePoints +
          (parsedBody.changes.new.skill.current - parsedBody.changes.old.skill.current) +
          (parsedBody.changes.new.skill.mod - parsedBody.changes.old.skill.mod);
        expect(parsedBody.changes.new.combatValues?.availablePoints).toBe(availableCombatPointsNew);
      }
      // Only skill is updated
      else {
        expect(calls.length).toBe(1);
      }

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
