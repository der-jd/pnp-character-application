import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { getAttribute } from "config/index.js";
import { _updateAttribute } from "increase-attribute/index.js";
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
      name: "Attribute has already been increased to the target start value (idempotency)",
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
      name: "Attribute has already been increased to the target mod value (idempotency)",
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
        expect(parsedBody.attribute.new.start).toBe(_case.request.body.start.newValue);
      }

      if (_case.request.body.current) {
        expect(parsedBody.attribute.new.current).toBe(
          _case.request.body.current.initialValue + _case.request.body.current.increasedPoints,
        );
      }

      if (_case.request.body.mod) {
        expect(parsedBody.attribute.new.mod).toBe(_case.request.body.mod.newValue);
      }

      const attributeOld = getAttribute(fakeCharacterResponse.Item.characterSheet.attributes, attributeName);
      expect(parsedBody.attribute.old).toStrictEqual(attributeOld);
      expect(parsedBody.attribute.new).toStrictEqual(parsedBody.attribute.old);

      const oldAvailableAttributePoints =
        fakeCharacterResponse.Item.characterSheet.calculationPoints.attributePoints.available;
      const diffAvailableAttributePoints = oldAvailableAttributePoints - parsedBody.attributePoints.new.available;
      expect(diffAvailableAttributePoints).toBe(0);

      const oldTotalAttributeCost = attributeOld.totalCost;
      const diffAttributeTotalCost = parsedBody.attribute.new.totalCost - oldTotalAttributeCost;
      expect(diffAvailableAttributePoints).toBe(diffAttributeTotalCost);
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
        expect(parsedBody.attribute.new.start).toBe(_case.request.body.start.newValue);
      }

      const oldAvailableAttributePoints =
        fakeCharacterResponse.Item.characterSheet.calculationPoints.attributePoints.available;
      const diffAvailableAttributePoints = oldAvailableAttributePoints - parsedBody.attributePoints.new.available;

      if (_case.request.body.current) {
        expect(parsedBody.attribute.new.current).toBe(
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
        expect(parsedBody.attribute.new.mod).toBe(_case.request.body.mod.newValue);
      }

      const attributeOld = getAttribute(fakeCharacterResponse.Item.characterSheet.attributes, attributeName);
      const oldTotalAttributeCost = attributeOld.totalCost;
      const diffAttributeTotalCost = parsedBody.attribute.new.totalCost - oldTotalAttributeCost;
      expect(diffAvailableAttributePoints).toBe(diffAttributeTotalCost);

      expect(parsedBody.attribute.old).toStrictEqual(attributeOld);

      // Check if the attribute was updated
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
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
});
