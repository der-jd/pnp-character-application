import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "./test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "./test-data/response.js";
import { fakeCharacter, fakeCharacterId } from "./test-data/character.js";
import { getCombatSkillHandling, getCombatStats } from "core";
import { CombatSection, CombatSkillName, SkillName, updateCombatStatsResponseSchema } from "api-spec";
import { expectHttpError } from "./utils.js";
import { _updateCombatStats } from "update-combat-stats";

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 2,
          },
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
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 2,
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
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 2,
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
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 2,
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
          skilledAttackValue: {
            initialValue: 5,
            increasedPoints: 2,
          },
          skilledParadeValue: {
            initialValue: 3,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Not enough points to increase the combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 50,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 50,
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
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 0,
          },
          skilledParadeValue: {
            initialValue: 0,
            increasedPoints: 2,
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
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 2,
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
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 2,
          },
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _updateCombatStats(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const idempotentTestCases = [
    {
      name: "Melee combat stats already updated to target value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          skilledAttackValue: {
            initialValue: fakeCharacter.characterSheet.combat.melee.thrustingWeapons1h.skilledAttackValue - 3,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: fakeCharacter.characterSheet.combat.melee.thrustingWeapons1h.skilledParadeValue - 2,
            increasedPoints: 2,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Ranged combat stats already updated to target value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "ranged",
          "combat-skill-name": "firearmSimple",
        },
        queryStringParameters: null,
        body: {
          skilledAttackValue: {
            initialValue: fakeCharacter.characterSheet.combat.ranged.firearmSimple.skilledAttackValue - 3,
            increasedPoints: 3,
          },
          skilledParadeValue: {
            initialValue: fakeCharacter.characterSheet.combat.ranged.firearmSimple.skilledParadeValue,
            increasedPoints: 0,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  idempotentTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateCombatStats(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateCombatStatsResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.userId).toBe(fakeUserId);
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.combatCategory).toBe(_case.request.pathParameters["combat-category"]);
      const skillName = _case.request.pathParameters["combat-skill-name"] as SkillName;
      expect(parsedBody.combatSkillName).toBe(skillName);

      const combatCategory = _case.request.pathParameters["combat-category"] as keyof CombatSection;
      const oldCombatStats = getCombatStats(
        fakeCharacterResponse.Item.characterSheet.combat,
        combatCategory,
        skillName,
      );
      expect(parsedBody.combatStats.old).toStrictEqual(oldCombatStats);
      expect(parsedBody.combatStats.new).toStrictEqual(parsedBody.combatStats.old);

      expect(parsedBody.combatStats.new.skilledAttackValue).toBe(
        _case.request.body.skilledAttackValue.initialValue + _case.request.body.skilledAttackValue.increasedPoints,
      );
      expect(parsedBody.combatStats.new.skilledParadeValue).toBe(
        _case.request.body.skilledParadeValue.initialValue + _case.request.body.skilledParadeValue.increasedPoints,
      );

      const rangedCombatCategory: keyof CombatSection = "ranged";
      if (combatCategory === rangedCombatCategory) {
        expect(parsedBody.combatStats.new.skilledParadeValue).toBe(0);
        expect(parsedBody.combatStats.new.paradeValue).toBe(0);
      }

      expect(parsedBody.combatStats.new.handling).toBe(getCombatSkillHandling(skillName as CombatSkillName));
    });
  });

  const updateTestCases = [
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
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 5,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 0,
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
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 0,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 4,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase all combat stats (melee combat skill)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "combat-category": "melee",
          "combat-skill-name": "thrustingWeapons1h",
        },
        queryStringParameters: null,
        body: {
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 5,
          },
          skilledParadeValue: {
            initialValue: 8,
            increasedPoints: 5,
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
          skilledAttackValue: {
            initialValue: 10,
            increasedPoints: 10,
          },
          skilledParadeValue: {
            initialValue: 0,
            increasedPoints: 0,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  updateTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateCombatStats(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateCombatStatsResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.userId).toBe(fakeUserId);
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.combatCategory).toBe(_case.request.pathParameters["combat-category"]);
      const skillName = _case.request.pathParameters["combat-skill-name"] as SkillName;
      expect(parsedBody.combatSkillName).toBe(skillName);

      const combatCategory = _case.request.pathParameters["combat-category"] as keyof CombatSection;
      const oldCombatStats = getCombatStats(
        fakeCharacterResponse.Item.characterSheet.combat,
        combatCategory,
        skillName,
      );
      expect(parsedBody.combatStats.old).toStrictEqual(oldCombatStats);

      expect(parsedBody.combatStats.new.skilledAttackValue).toBe(
        _case.request.body.skilledAttackValue.initialValue + _case.request.body.skilledAttackValue.increasedPoints,
      );

      const rangedCombatCategory: keyof CombatSection = "ranged";
      if (combatCategory === rangedCombatCategory) {
        const rangedAttackBaseValue =
          fakeCharacterResponse.Item.characterSheet.baseValues.rangedAttackBaseValue.current +
          fakeCharacterResponse.Item.characterSheet.baseValues.rangedAttackBaseValue.mod;
        expect(parsedBody.combatStats.new.attackValue).toBe(
          parsedBody.combatStats.new.skilledAttackValue + rangedAttackBaseValue,
        );

        expect(parsedBody.combatStats.new.skilledParadeValue).toBe(0);
        expect(parsedBody.combatStats.new.paradeValue).toBe(0);
      } else {
        const attackBaseValue =
          fakeCharacterResponse.Item.characterSheet.baseValues.attackBaseValue.current +
          fakeCharacterResponse.Item.characterSheet.baseValues.attackBaseValue.mod;
        expect(parsedBody.combatStats.new.attackValue).toBe(
          parsedBody.combatStats.new.skilledAttackValue + attackBaseValue,
        );

        expect(parsedBody.combatStats.new.skilledParadeValue).toBe(
          _case.request.body.skilledParadeValue.initialValue + _case.request.body.skilledParadeValue.increasedPoints,
        );
        const paradeBaseValue =
          fakeCharacterResponse.Item.characterSheet.baseValues.paradeBaseValue.current +
          fakeCharacterResponse.Item.characterSheet.baseValues.paradeBaseValue.mod;
        expect(parsedBody.combatStats.new.paradeValue).toBe(
          parsedBody.combatStats.new.skilledParadeValue + paradeBaseValue,
        );
      }

      const oldAvailablePoints = oldCombatStats.availablePoints;
      const diffAvailablePoints = oldAvailablePoints - parsedBody.combatStats.new.availablePoints;
      const diffCombatStats =
        parsedBody.combatStats.new.attackValue -
        oldCombatStats.attackValue +
        (parsedBody.combatStats.new.paradeValue - oldCombatStats.paradeValue);
      expect(diffAvailablePoints).toBe(diffCombatStats);

      expect(parsedBody.combatStats.new.handling).toBe(getCombatSkillHandling(skillName as CombatSkillName));
      expect(parsedBody.combatStats.new.handling).toBe(parsedBody.combatStats.old.handling);

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
      expect(calls).toHaveLength(1);

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
