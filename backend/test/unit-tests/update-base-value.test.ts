import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "./test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "./test-data/response.js";
import { fakeCharacter, fakeCharacterId } from "./test-data/character.js";
import { BaseValues, CombatSection, CombatStats, updateBaseValueResponseSchema } from "api-spec";
import { getBaseValue } from "core";
import { _updateBaseValue } from "update-base-value";
import { expectHttpError } from "./utils.js";

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 10,
            newValue: 15,
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
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 10,
            newValue: 15,
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
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 10,
            newValue: 15,
          },
        },
      },
      expectedStatusCode: 401,
    },
    {
      name: "Passed initial start value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 20,
            newValue: 30,
          },
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
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 15,
            newValue: 20,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Character id is not an UUID",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": "1234567890",
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 10,
            newValue: 15,
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
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 10,
            newValue: 15,
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
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 10,
            newValue: 15,
          },
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _updateBaseValue(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const idempotentTestCases = [
    {
      name: "Base value has already been updated to the target start value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: fakeCharacter.characterSheet.baseValues.healthPoints.start - 10,
            newValue: fakeCharacter.characterSheet.baseValues.healthPoints.start,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Base value has already been updated to the target mod value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: fakeCharacter.characterSheet.baseValues.healthPoints.mod - 7,
            newValue: fakeCharacter.characterSheet.baseValues.healthPoints.mod,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  idempotentTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateBaseValue(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateBaseValueResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      const baseValueName = _case.request.pathParameters["base-value-name"];
      expect(parsedBody.baseValueName).toBe(baseValueName);

      const baseValueOld = getBaseValue(fakeCharacterResponse.Item.characterSheet.baseValues, baseValueName);
      expect(parsedBody.changes.old.baseValue).toStrictEqual(baseValueOld);
      expect(parsedBody.changes.new.baseValue).toStrictEqual(parsedBody.changes.old.baseValue);

      if (_case.request.body.start) {
        expect(parsedBody.changes.new.baseValue.start).toBe(_case.request.body.start.newValue);
      }

      if (_case.request.body.mod) {
        expect(parsedBody.changes.new.baseValue.mod).toBe(_case.request.body.mod.newValue);
      }

      expect(parsedBody.changes.old.combat).toBeUndefined();
      expect(parsedBody.changes.new.combat).toBeUndefined();
    });
  });

  const baseValueTestCases = [
    {
      name: "Update start value of healthPoints",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 40,
            newValue: 30,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update start value of attackBaseValue -> no changes to melee combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "attackBaseValue",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 30,
            newValue: 40,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update start value of rangedAttackBaseValue -> no changes to ranged combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "rangedAttackBaseValue",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 25,
            newValue: 35,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update mod value of healthPoints",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 10,
            newValue: 13,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update all values (start, mod) of healthPoints",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 40,
            newValue: 30,
          },
          mod: {
            initialValue: 10,
            newValue: 13,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  baseValueTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateBaseValue(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateBaseValueResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      const baseValueName = _case.request.pathParameters["base-value-name"];
      expect(parsedBody.baseValueName).toBe(baseValueName);

      const baseValueOld = getBaseValue(fakeCharacterResponse.Item.characterSheet.baseValues, baseValueName);
      expect(parsedBody.changes.old.baseValue).toStrictEqual(baseValueOld);

      expect(parsedBody.changes.new.baseValue.byFormula).toBe(baseValueOld.byFormula);
      expect(parsedBody.changes.new.baseValue.current).toBe(baseValueOld.current);
      expect(parsedBody.changes.new.baseValue.byLvlUp).toBe(baseValueOld.byLvlUp);

      if (_case.request.body.start) {
        expect(parsedBody.changes.new.baseValue.start).toBe(_case.request.body.start.newValue);
      }

      if (_case.request.body.mod) {
        expect(parsedBody.changes.new.baseValue.mod).toBe(_case.request.body.mod.newValue);
      }

      expect(parsedBody.changes.old.combat).toBeUndefined();
      expect(parsedBody.changes.new.combat).toBeUndefined();

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);

      // Base value is updated
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

  const combatStatsTestCases = [
    {
      name: "Update mod value of attackBaseValue -> changes to melee combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "attackBaseValue",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 0,
            newValue: 10,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update mod value of paradeBaseValue -> changes to melee combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "paradeBaseValue",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 0,
            newValue: 10,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update mod value of rangedAttackBaseValue -> changes to ranged combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "rangedAttackBaseValue",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 0,
            newValue: 10,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update all values (start, mod) of attackBaseValue -> changes to melee combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "attackBaseValue",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 30,
            newValue: 50,
          },
          mod: {
            initialValue: 0,
            newValue: 5,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update all values (start, mod) of paradeBaseValue -> changes to melee combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "paradeBaseValue",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 30,
            newValue: 50,
          },
          mod: {
            initialValue: 0,
            newValue: 5,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update all values (start, mod) of rangedAttackBaseValue -> changes to ranged combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "rangedAttackBaseValue",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 25,
            newValue: 45,
          },
          mod: {
            initialValue: 0,
            newValue: 5,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  combatStatsTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateBaseValue(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateBaseValueResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      const baseValueName = _case.request.pathParameters["base-value-name"];
      expect(parsedBody.baseValueName).toBe(baseValueName);

      // Check old and new base value
      const baseValueOld = getBaseValue(fakeCharacterResponse.Item.characterSheet.baseValues, baseValueName);
      expect(parsedBody.changes.old.baseValue).toStrictEqual(baseValueOld);
      expect(parsedBody.changes.new.baseValue.byFormula).toBe(baseValueOld.byFormula);
      expect(parsedBody.changes.new.baseValue.current).toBe(baseValueOld.current);
      expect(parsedBody.changes.new.baseValue.byLvlUp).toBe(baseValueOld.byLvlUp);
      // No byLvlUp for combat base values allowed
      expect(parsedBody.changes.new.baseValue.byLvlUp).toBeUndefined();

      if (_case.request.body.start) {
        expect(parsedBody.changes.new.baseValue.start).toBe(_case.request.body.start.newValue);
      }

      if (_case.request.body.mod) {
        expect(parsedBody.changes.new.baseValue.mod).toBe(_case.request.body.mod.newValue);
      }

      // Combat stats should be defined
      expect(parsedBody.changes.old.combat).toBeDefined();
      expect(parsedBody.changes.new.combat).toBeDefined();
      if (!parsedBody.changes.old.combat || !parsedBody.changes.new.combat) {
        throw new Error("Combat stats should be defined but are missing in the response");
      }

      // Check combat stats for melee skills
      const attackBaseValueKey: keyof BaseValues = "attackBaseValue";
      const paradeBaseValueKey: keyof BaseValues = "paradeBaseValue";
      const meleeCombatStatsChanged: boolean =
        parsedBody.baseValueName === attackBaseValueKey || parsedBody.baseValueName === paradeBaseValueKey;
      if (meleeCombatStatsChanged) {
        expect(parsedBody.changes.old.combat.melee).toBeDefined();
        expect(parsedBody.changes.new.combat.melee).toBeDefined();
        if (!parsedBody.changes.old.combat.melee || !parsedBody.changes.new.combat.melee) {
          throw new Error("Melee combat stats should be defined but are missing in the response");
        }

        expect(parsedBody.changes.old.combat.melee).toStrictEqual(
          fakeCharacterResponse.Item.characterSheet.combat.melee
        );

        for (const skillName of Object.keys(parsedBody.changes.old.combat.melee)) {
          const oldCombatStats = parsedBody.changes.old.combat.melee[skillName as keyof CombatSection["melee"]];
          const newCombatStats = parsedBody.changes.new.combat.melee[skillName as keyof CombatSection["melee"]];

          if (!oldCombatStats || !newCombatStats) {
            throw new Error(`Combat stats ${skillName} should be defined but are missing in the response`);
          }

          // Only attack and parade value must differ
          for (const key of Object.keys(oldCombatStats) as (keyof CombatStats)[]) {
            const attackValueKey: keyof CombatStats = "attackValue";
            const paradeValueKey: keyof CombatStats = "paradeValue";
            if (key === attackValueKey || key === paradeValueKey) continue;
            expect(newCombatStats[key]).toStrictEqual(oldCombatStats[key]);
          }

          // Check the difference between old and new values
          const diffAttackValue = newCombatStats.attackValue - oldCombatStats.attackValue;
          let diffAttackBaseValue = 0;
          if (parsedBody.baseValueName === attackBaseValueKey) {
            diffAttackBaseValue =
              parsedBody.changes.new.baseValue.current -
              parsedBody.changes.old.baseValue.current +
              parsedBody.changes.new.baseValue.mod -
              parsedBody.changes.old.baseValue.mod;
          }
          expect(diffAttackValue).toBe(diffAttackBaseValue);

          const diffParadeValue = newCombatStats.paradeValue - oldCombatStats.paradeValue;
          let diffParadeBaseValue = 0;
          if (parsedBody.baseValueName === paradeBaseValueKey) {
            diffParadeBaseValue =
              parsedBody.changes.new.baseValue.current -
              parsedBody.changes.old.baseValue.current +
              parsedBody.changes.new.baseValue.mod -
              parsedBody.changes.old.baseValue.mod;
          }
          expect(diffParadeValue).toBe(diffParadeBaseValue);
        }
      }

      // Check combat stats for ranged skills
      const rangedAttackBaseValueKey: keyof BaseValues = "rangedAttackBaseValue";
      const rangedCombatStatsChanged: boolean = parsedBody.baseValueName === rangedAttackBaseValueKey;
      if (rangedCombatStatsChanged) {
        expect(parsedBody.changes.old.combat.ranged).toBeDefined();
        expect(parsedBody.changes.new.combat.ranged).toBeDefined();
        if (!parsedBody.changes.old.combat.ranged || !parsedBody.changes.new.combat.ranged) {
          throw new Error("Ranged combat stats should be defined but are missing in the response");
        }

        expect(parsedBody.changes.old.combat.ranged).toStrictEqual(
          fakeCharacterResponse.Item.characterSheet.combat.ranged
        );

        for (const skillName of Object.keys(parsedBody.changes.old.combat.ranged)) {
          const oldCombatStats = parsedBody.changes.old.combat.ranged[skillName as keyof CombatSection["ranged"]];
          const newCombatStats = parsedBody.changes.new.combat.ranged[skillName as keyof CombatSection["ranged"]];

          if (!oldCombatStats || !newCombatStats) {
            throw new Error(`Combat stats ${skillName} should be defined but are missing in the response`);
          }

          // Only attack value must differ
          for (const key of Object.keys(oldCombatStats) as (keyof CombatStats)[]) {
            const attackValueKey: keyof CombatStats = "attackValue";
            if (key === attackValueKey) continue;
            expect(newCombatStats[key]).toStrictEqual(oldCombatStats[key]);
          }

          // Check the difference between old and new values
          const diffAttackValue = newCombatStats.attackValue - oldCombatStats.attackValue;
          const diffRangedAttackBaseValue =
            parsedBody.changes.new.baseValue.current -
            parsedBody.changes.old.baseValue.current +
            parsedBody.changes.new.baseValue.mod -
            parsedBody.changes.old.baseValue.mod;
          expect(diffAttackValue).toBe(diffRangedAttackBaseValue);

          expect(newCombatStats.paradeValue).toBe(0); // No parade for ranged skills
        }
      }

      if (!meleeCombatStatsChanged && !rangedCombatStatsChanged) {
        throw new Error("No combat stats changed");
      }

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);

      // Base value and combat stats are updated
      expect(calls.length).toBeGreaterThanOrEqual(2);

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
