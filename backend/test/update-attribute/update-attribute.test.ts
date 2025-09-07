import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { CharacterSheet } from "shared";
import { getAttribute } from "config";
import { _updateAttribute } from "update-attribute";
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
            initialValue: 15,
            newValue: 17,
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
            initialValue: 17,
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
            initialValue: 0,
            newValue: 1,
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

      const parsedBody = JSON.parse(result.body);
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

      const oldAvailableAttributePoints =
        fakeCharacterResponse.Item.characterSheet.calculationPoints.attributePoints.available;
      const diffAvailableAttributePoints = oldAvailableAttributePoints - parsedBody.attributePoints.new.available;
      expect(diffAvailableAttributePoints).toBe(0);

      const oldTotalAttributeCost = attributeOld.totalCost;
      const diffAttributeTotalCost = parsedBody.changes.new.attribute.totalCost - oldTotalAttributeCost;
      expect(diffAvailableAttributePoints).toBe(diffAttributeTotalCost);

      expect(parsedBody.changes.old.baseValues).toBeUndefined();
      expect(parsedBody.changes.new.baseValues).toBeUndefined();
    });
  });

  const updateTestCases = [
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

  updateTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateAttribute(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
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

      // Attribute and base values are updated
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

  const baseValuesChangedTestCases = [
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
      name: "Update mod value of attribute 'courage' -> changed base values",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "courage",
        },
        queryStringParameters: null,
        body: {
          mod: {
            initialValue: 3,
            newValue: 10,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update current and mod value of attribute 'strength' -> changed base values",
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
          mod: {
            initialValue: 1,
            newValue: 2,
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  baseValuesChangedTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateAttribute(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      const attributeName = _case.request.pathParameters["attribute-name"];
      expect(parsedBody.attributeName).toBe(attributeName);

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);

      // Attribute and base values are updated
      if (baseValuesChanged(parsedBody)) {
        expect(calls.length).toBeGreaterThan(1);

        expect(parsedBody.changes.old.baseValues).toBeDefined();
        expect(parsedBody.changes.new.baseValues).toBeDefined();

        for (const baseValueName of Object.keys(
          parsedBody.changes.old.baseValues,
        ) as (keyof CharacterSheet["baseValues"])[]) {
          const oldVal = parsedBody.changes.old.baseValues[baseValueName];
          const newVal = parsedBody.changes.new.baseValues[baseValueName];

          // Only byFormula and current should differ
          for (const key of Object.keys(oldVal) as (keyof typeof oldVal)[]) {
            if (key === "byFormula" || key === "current") continue;
            expect(newVal[key]).toStrictEqual(oldVal[key]);
          }

          const diffCurrent = newVal.current - oldVal.current;
          const diffByFormula = newVal.byFormula - oldVal.byFormula;
          expect(diffCurrent).toBe(diffByFormula);

          switch (baseValueName) {
            case "healthPoints":
              expect(newVal.current).toBe(102);
              expect(newVal.byFormula).toBe(79);
              break;
            case "mentalHealth":
              expect(newVal.current).toBe(57);
              expect(newVal.byFormula).toBe(57);
              break;
            case "initiativeBaseValue":
              expect(newVal.current).toBe(27);
              expect(newVal.byFormula).toBe(17);
              break;
            case "attackBaseValue":
              if (attributeName === "strength") {
                expect(newVal.current).toBe(114);
                expect(newVal.byFormula).toBe(114);
              } else if (attributeName === "courage") {
                expect(newVal.current).toBe(124);
                expect(newVal.byFormula).toBe(124);
              }
              break;
            case "paradeBaseValue":
              expect(newVal.current).toBe(116);
              expect(newVal.byFormula).toBe(116);
              break;
            case "rangedAttackBaseValue":
              expect(newVal.current).toBe(112);
              expect(newVal.byFormula).toBe(112);
              break;
          }
        }
      }
      // Only attribute is updated
      else {
        expect(calls.length).toBe(1);
        expect(parsedBody.changes.old.baseValues).toBeUndefined();
        expect(parsedBody.changes.new.baseValues).toBeUndefined();
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

function baseValuesChanged(body: any): boolean {
  if (body.attributeName === "intelligence" || body.attributeName === "charisma") return false;

  if (
    body.changes.new.attribute.current === body.changes.old.attribute.current &&
    body.changes.new.attribute.mod === body.changes.old.attribute.mod
  )
    return false;

  return true;
}
