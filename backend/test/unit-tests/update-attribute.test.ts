import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "./test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "./test-data/response.js";
import { fakeCharacter, fakeCharacterId } from "./test-data/character.js";
import { Attributes, BaseValue, BaseValues, CombatSection, CombatStats, updateAttributeResponseSchema } from "api-spec";
import { getAttribute } from "core";
import { _updateAttribute } from "update-attribute";
import { expectHttpError } from "./utils.js";

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 1,
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
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 1,
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
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 401,
    },
    {
      name: "Passed initial start attribute value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 10,
            newValue: 12,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Passed initial current attribute value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 10,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Passed initial mod attribute value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 5,
            newValue: 10,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Not enough attribute points",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 10,
          },
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
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 1,
          },
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
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 0,
          },
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
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: -1,
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
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 1,
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
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _updateAttribute(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const idempotentTestCases = [
    {
      name: "Attribute has already been updated to the target start value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: fakeCharacter.characterSheet.attributes.endurance.start - 2,
            newValue: fakeCharacter.characterSheet.attributes.endurance.start,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Attribute has already been increased to the target current value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: fakeCharacter.characterSheet.attributes.endurance.current - 1,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Attribute has already been updated to the target mod value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: fakeCharacter.characterSheet.attributes.endurance.mod - 1,
            newValue: fakeCharacter.characterSheet.attributes.endurance.mod,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  idempotentTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateAttribute(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateAttributeResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      const attributeName = _case.request.pathParameters["attribute-name"];
      expect(parsedBody.attributeName).toBe(attributeName);

      if (_case.request.body.start) {
        expect(parsedBody.changes.new.attribute.start).toBe(_case.request.body.start.newValue);
      }

      if (_case.request.body.current) {
        expect(parsedBody.changes.new.attribute.current).toBe(
          _case.request.body.current.initialValue + _case.request.body.current.increasedPoints,
        );
      }

      if (_case.request.body.mod) {
        expect(parsedBody.changes.new.attribute.mod).toBe(_case.request.body.mod.newValue);
      }

      const attributeOld = getAttribute(fakeCharacterResponse.Item.characterSheet.attributes, attributeName);
      expect(parsedBody.changes.old.attribute).toStrictEqual(attributeOld);
      expect(parsedBody.changes.new.attribute).toStrictEqual(parsedBody.changes.old.attribute);

      const oldAttributePoints = fakeCharacterResponse.Item.characterSheet.calculationPoints.attributePoints;
      const oldAvailableAttributePoints = oldAttributePoints.available;
      const diffAvailableAttributePoints = oldAvailableAttributePoints - parsedBody.attributePoints.new.available;
      expect(diffAvailableAttributePoints).toBe(0);
      expect(parsedBody.attributePoints.old).toStrictEqual(oldAttributePoints);
      expect(parsedBody.attributePoints.new).toStrictEqual(oldAttributePoints);

      const oldTotalAttributeCost = attributeOld.totalCost;
      const diffAttributeTotalCost = parsedBody.changes.new.attribute.totalCost - oldTotalAttributeCost;
      expect(diffAvailableAttributePoints).toBe(diffAttributeTotalCost);

      expect(parsedBody.changes.old.baseValues).toBeUndefined();
      expect(parsedBody.changes.new.baseValues).toBeUndefined();

      expect(parsedBody.changes.old.combat).toBeUndefined();
      expect(parsedBody.changes.new.combat).toBeUndefined();
    });
  });

  const attributeTestCases = [
    {
      name: "Update start attribute value",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 17,
            newValue: 15,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase current attribute value by 1 point",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase current attribute value by 3 point",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 3,
          },
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
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 1,
            newValue: 5,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update all attribute values (start, current, mod)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 17,
            newValue: 20,
          },
          current: {
            initialValue: 18,
            increasedPoints: 1,
          },
          mod: {
            initialValue: 1,
            newValue: 5,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  attributeTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateAttribute(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateAttributeResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      const attributeName = _case.request.pathParameters["attribute-name"];
      expect(parsedBody.attributeName).toBe(attributeName);

      if (_case.request.body.start) {
        expect(parsedBody.changes.new.attribute.start).toBe(_case.request.body.start.newValue);
      }

      const oldAvailableAttributePoints =
        fakeCharacterResponse.Item.characterSheet.calculationPoints.attributePoints.available;
      const diffAvailableAttributePoints = oldAvailableAttributePoints - parsedBody.attributePoints.new.available;

      if (_case.request.body.current) {
        expect(parsedBody.changes.new.attribute.current).toBe(
          _case.request.body.current.initialValue + _case.request.body.current.increasedPoints,
        );

        switch (_case.request.body.current.increasedPoints) {
          case 1:
            expect(diffAvailableAttributePoints).toBe(1);
            break;
          case 3:
            expect(diffAvailableAttributePoints).toBe(3);
            break;
          default:
            throw new Error(`Test case with unknown increased points: ${_case.request.body.current.increasedPoints}`);
        }
      }

      if (_case.request.body.mod) {
        expect(parsedBody.changes.new.attribute.mod).toBe(_case.request.body.mod.newValue);
      }

      const attributeOld = getAttribute(fakeCharacterResponse.Item.characterSheet.attributes, attributeName);
      const oldTotalAttributeCost = attributeOld.totalCost;
      const diffAttributeTotalCost = parsedBody.changes.new.attribute.totalCost - oldTotalAttributeCost;
      expect(diffAvailableAttributePoints).toBe(diffAttributeTotalCost);

      expect(parsedBody.changes.old.attribute).toStrictEqual(attributeOld);

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);

      // Attribute and potentially base values and combat stats are updated
      expect(calls.length).toBeGreaterThanOrEqual(1);

      const matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Key.characterId === _case.request.pathParameters["character-id"] && input.Key.userId === fakeUserId
        );
      });
      expect(matchingCall).toBeTruthy();
    });
  });

  const baseValuesTestCases = [
    {
      name: "Update start value of attribute 'strength' -> unchanged base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "strength",
        },
        queryStringParameters: null,
        body: {
          start: {
            initialValue: 17,
            newValue: 20,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase current value of attribute 'intelligence' -> unchanged base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "intelligence",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 12,
            increasedPoints: 5,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'charisma' -> unchanged base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "charisma",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 13,
            increasedPoints: 2,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'mental resilience' -> changed base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "mentalResilience",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 10,
            increasedPoints: 5,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update mod value of attribute 'mental resilience' -> changed base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "mentalResilience",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 2,
            newValue: 7,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current and mod value of attribute 'endurance' -> changed base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 3,
          },
          mod: {
            initialValue: 1,
            newValue: 3,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'dexterity' -> changed base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "dexterity",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 16,
            increasedPoints: 5,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'concentration' -> changed base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "concentration",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 14,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'courage' -> changed base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "courage",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 15,
            increasedPoints: 3,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'strength' -> changed base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "strength",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  // Mapping of attributes to the base values they affect. Used for the tests for base value changes.
  type AttributeEffectMap = Record<keyof Attributes, Partial<Record<keyof BaseValues, number>>>;
  const attributeEffectOnBaseValueFormula: AttributeEffectMap = {
    strength: {
      healthPoints: 1,
      attackBaseValue: 2,
      paradeBaseValue: 2,
      rangedAttackBaseValue: 2,
    },
    endurance: {
      healthPoints: 10,
      initiativeBaseValue: 1,
      paradeBaseValue: 10,
    },
    mentalResilience: {
      mentalHealth: 10,
    },
    courage: {
      mentalHealth: 3,
      initiativeBaseValue: 1,
      attackBaseValue: 6,
    },
    dexterity: {
      initiativeBaseValue: 1,
      attackBaseValue: 10,
      paradeBaseValue: 10,
      rangedAttackBaseValue: 10,
    },
    concentration: {
      rangedAttackBaseValue: 2,
    },
    intelligence: {},
    charisma: {},
  };

  baseValuesTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateAttribute(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateAttributeResponseSchema.parse(JSON.parse(result.body));
      const attributeName = _case.request.pathParameters["attribute-name"];
      expect(parsedBody.attributeName).toBe(attributeName);

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
      const matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Key.characterId === _case.request.pathParameters["character-id"] && input.Key.userId === fakeUserId
        );
      });
      expect(matchingCall).toBeTruthy();

      // Attribute and base values are updated
      if (baseValuesChanged(parsedBody)) {
        expect(calls.length).toBeGreaterThanOrEqual(2);

        expect(parsedBody.changes.old.baseValues).toBeDefined();
        expect(parsedBody.changes.new.baseValues).toBeDefined();
        if (!parsedBody.changes.old.baseValues || !parsedBody.changes.new.baseValues) {
          throw new Error("Base values should be defined but are missing in the response");
        }

        // These base values should never be changed by attributes according to the formulas
        const armorLevel: keyof BaseValues = "armorLevel";
        const naturalArmor: keyof BaseValues = "naturalArmor";
        const luckPoints: keyof BaseValues = "luckPoints";
        const bonusActionsPerCombatRound: keyof BaseValues = "bonusActionsPerCombatRound";
        const legendaryActions: keyof BaseValues = "legendaryActions";
        expect(parsedBody.changes.old.baseValues[armorLevel]).toBeUndefined();
        expect(parsedBody.changes.old.baseValues[naturalArmor]).toBeUndefined();
        expect(parsedBody.changes.old.baseValues[luckPoints]).toBeUndefined();
        expect(parsedBody.changes.old.baseValues[bonusActionsPerCombatRound]).toBeUndefined();
        expect(parsedBody.changes.old.baseValues[legendaryActions]).toBeUndefined();
        expect(parsedBody.changes.new.baseValues[armorLevel]).toBeUndefined();
        expect(parsedBody.changes.new.baseValues[naturalArmor]).toBeUndefined();
        expect(parsedBody.changes.new.baseValues[luckPoints]).toBeUndefined();
        expect(parsedBody.changes.new.baseValues[bonusActionsPerCombatRound]).toBeUndefined();
        expect(parsedBody.changes.new.baseValues[legendaryActions]).toBeUndefined();

        // Ensure all base values defined in the attribute effect map are present in the response
        const attributeEffects = attributeEffectOnBaseValueFormula[attributeName as keyof Attributes];
        for (const baseValueName of Object.keys(attributeEffects) as (keyof BaseValues)[]) {
          expect(parsedBody.changes.old.baseValues[baseValueName]).toBeDefined();
          expect(parsedBody.changes.new.baseValues[baseValueName]).toBeDefined();
        }

        // Parsed body contains only changed base values
        for (const baseValueName of Object.keys(parsedBody.changes.old.baseValues) as (keyof BaseValues)[]) {
          const oldVal = parsedBody.changes.old.baseValues[baseValueName];
          const newVal = parsedBody.changes.new.baseValues[baseValueName];

          expect(oldVal).toBeDefined();
          expect(newVal).toBeDefined();
          if (!oldVal || !newVal || !oldVal.byFormula || !newVal.byFormula) {
            throw new Error(`Base value ${baseValueName}.byFormula should be defined but is missing in the response`);
          }
          expect(oldVal.byFormula).toBeDefined();
          expect(newVal.byFormula).toBeDefined();

          // Check if the old value is the same as in the database
          expect(oldVal).toStrictEqual(fakeCharacterResponse.Item.characterSheet.baseValues[baseValueName]);

          // Only byFormula and current value should differ
          for (const key of Object.keys(oldVal) as (keyof BaseValue)[]) {
            if (key === "byFormula" || key === "current") continue;
            expect(newVal[key]).toStrictEqual(oldVal[key]);
          }

          // Check the difference between old and new values
          const diffCurrent = newVal.current - oldVal.current;
          const diffByFormula = newVal.byFormula - oldVal.byFormula;
          expect(diffCurrent).toBe(diffByFormula);

          // Check the effect of the attribute on the base values
          const expectedEffect = attributeEffects[baseValueName];
          expect(newVal.current).toBe(oldVal.current + (expectedEffect ?? 0));
          expect(newVal.byFormula).toBe(oldVal.byFormula + (expectedEffect ?? 0));
        }
      }
      // Only attribute is updated
      else {
        expect(calls.length).toBe(1); // Only attribute is updated
        expect(parsedBody.changes.old.baseValues).toBeUndefined();
        expect(parsedBody.changes.new.baseValues).toBeUndefined();
        expect(parsedBody.changes.old.combat).toBeUndefined();
        expect(parsedBody.changes.new.combat).toBeUndefined();
      }
    });
  });

  const combatStatsTestCases = [
    {
      name: "Update current and mod value of attribute 'endurance' -> changed combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 3,
          },
          mod: {
            initialValue: 1,
            newValue: 3,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'dexterity' -> changed combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "dexterity",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 16,
            increasedPoints: 5,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'concentration' -> changed combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "concentration",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 14,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'courage' -> changed combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "courage",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 15,
            increasedPoints: 3,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current value of attribute 'strength' -> changed combat stats",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "strength",
        },
        queryStringParameters: null,
        body: {
          current: {
            initialValue: 18,
            increasedPoints: 1,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  combatStatsTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateAttribute(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateAttributeResponseSchema.parse(JSON.parse(result.body));
      const attributeName = _case.request.pathParameters["attribute-name"];
      expect(parsedBody.attributeName).toBe(attributeName);

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
      const matchingCall = calls.find((call: any) => {
        const input = call.args[0].input;
        return (
          input.Key.characterId === _case.request.pathParameters["character-id"] && input.Key.userId === fakeUserId
        );
      });
      expect(matchingCall).toBeTruthy();
      expect(calls.length).toBeGreaterThanOrEqual(3); // Update attribute, base values and combat stats

      // Base values should be defined
      expect(parsedBody.changes.old.baseValues).toBeDefined();
      expect(parsedBody.changes.new.baseValues).toBeDefined();
      if (!parsedBody.changes.old.baseValues || !parsedBody.changes.new.baseValues) {
        throw new Error("Base values should be defined but are missing in the response");
      }

      // Combat stats should be defined
      expect(parsedBody.changes.old.combat).toBeDefined();
      expect(parsedBody.changes.new.combat).toBeDefined();
      if (!parsedBody.changes.old.combat || !parsedBody.changes.new.combat) {
        throw new Error("Combat stats should be defined but are missing in the response");
      }

      const attributeEffects = attributeEffectOnBaseValueFormula[attributeName as keyof Attributes];

      // Check combat stats for melee skills
      const meleeCombatStatsChanged: boolean =
        parsedBody.changes.new.baseValues.attackBaseValue !== undefined ||
        parsedBody.changes.new.baseValues.paradeBaseValue !== undefined;
      if (meleeCombatStatsChanged) {
        expect(
          (parsedBody.changes.old.baseValues.attackBaseValue && parsedBody.changes.new.baseValues.attackBaseValue) ||
            (parsedBody.changes.old.baseValues.paradeBaseValue && parsedBody.changes.new.baseValues.paradeBaseValue),
        ).toBeTruthy();
        if (
          !parsedBody.changes.old.baseValues.attackBaseValue &&
          !parsedBody.changes.new.baseValues.attackBaseValue &&
          !parsedBody.changes.old.baseValues.paradeBaseValue &&
          !parsedBody.changes.new.baseValues.paradeBaseValue
        ) {
          throw new Error("Attack base value or parade base value should be defined but are missing in the response");
        }

        expect(parsedBody.changes.old.combat.melee).toBeDefined();
        expect(parsedBody.changes.new.combat.melee).toBeDefined();
        if (!parsedBody.changes.old.combat.melee || !parsedBody.changes.new.combat.melee) {
          throw new Error("Melee combat stats should be defined but are missing in the response");
        }

        expect(parsedBody.changes.old.combat.melee).toStrictEqual(
          fakeCharacterResponse.Item.characterSheet.combat.melee,
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
          if (parsedBody.changes.old.baseValues.attackBaseValue && parsedBody.changes.new.baseValues.attackBaseValue) {
            diffAttackBaseValue =
              parsedBody.changes.new.baseValues.attackBaseValue.current -
              parsedBody.changes.old.baseValues.attackBaseValue.current +
              parsedBody.changes.new.baseValues.attackBaseValue.mod -
              parsedBody.changes.old.baseValues.attackBaseValue.mod;
          }
          expect(diffAttackValue).toBe(diffAttackBaseValue);
          expect(diffAttackValue).toBe(attributeEffects.attackBaseValue ?? 0);

          const diffParadeValue = newCombatStats.paradeValue - oldCombatStats.paradeValue;
          let diffParadeBaseValue = 0;
          if (parsedBody.changes.old.baseValues.paradeBaseValue && parsedBody.changes.new.baseValues.paradeBaseValue) {
            diffParadeBaseValue =
              parsedBody.changes.new.baseValues.paradeBaseValue.current -
              parsedBody.changes.old.baseValues.paradeBaseValue.current +
              parsedBody.changes.new.baseValues.paradeBaseValue.mod -
              parsedBody.changes.old.baseValues.paradeBaseValue.mod;
          }
          expect(diffParadeValue).toBe(diffParadeBaseValue);
          expect(diffParadeValue).toBe(attributeEffects.paradeBaseValue ?? 0);
        }
      }

      // Check combat stats for ranged skills
      const rangedCombatStatsChanged: boolean = parsedBody.changes.new.baseValues.rangedAttackBaseValue !== undefined;
      if (rangedCombatStatsChanged) {
        expect(parsedBody.changes.old.baseValues.rangedAttackBaseValue).toBeDefined();
        expect(parsedBody.changes.new.baseValues.rangedAttackBaseValue).toBeDefined();
        if (
          !parsedBody.changes.old.baseValues.rangedAttackBaseValue ||
          !parsedBody.changes.new.baseValues.rangedAttackBaseValue
        ) {
          throw new Error("Ranged attack base value should be defined but is missing in the response");
        }

        expect(parsedBody.changes.old.combat.ranged).toBeDefined();
        expect(parsedBody.changes.new.combat.ranged).toBeDefined();
        if (!parsedBody.changes.old.combat.ranged || !parsedBody.changes.new.combat.ranged) {
          throw new Error("Ranged combat stats should be defined but are missing in the response");
        }

        expect(parsedBody.changes.old.combat.ranged).toStrictEqual(
          fakeCharacterResponse.Item.characterSheet.combat.ranged,
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
            parsedBody.changes.new.baseValues.rangedAttackBaseValue.current -
            parsedBody.changes.old.baseValues.rangedAttackBaseValue.current +
            parsedBody.changes.new.baseValues.rangedAttackBaseValue.mod -
            parsedBody.changes.old.baseValues.rangedAttackBaseValue.mod;
          expect(diffAttackValue).toBe(diffRangedAttackBaseValue);
          // 0 should not happen because ranged combat stats are only changed when rangedAttackBaseValue is available
          expect(diffAttackValue).toBe(attributeEffects.rangedAttackBaseValue ?? 0);

          expect(newCombatStats.paradeValue).toBe(0); // No parade for ranged skills
        }
      }

      if (!meleeCombatStatsChanged && !rangedCombatStatsChanged) {
        throw new Error("No combat stats changed");
      }
    });
  });
});

function baseValuesChanged(body: any): boolean {
  if (body.attributeName === "intelligence" || body.attributeName === "charisma") return false;

  if (
    body.changes.new.attribute.current === body.changes.old.attribute.current &&
    body.changes.new.attribute.mod === body.changes.old.attribute.mod
  )
    return false;

  return true;
}
