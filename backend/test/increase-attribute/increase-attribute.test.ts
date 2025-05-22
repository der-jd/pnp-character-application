import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { getAttribute } from "config/index.js";
import { increaseAttribute } from "increase-attribute/index.js";
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
          initialValue: 16,
          increasedPoints: 1,
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
          initialValue: 16,
          increasedPoints: 1,
        },
      },
      expectedStatusCode: 401,
    },
    {
      name: "Passed initial attribute value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          initialValue: 10,
          increasedPoints: 1,
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
          initialValue: 18,
          increasedPoints: 8,
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
          initialValue: 18,
          increasedPoints: 1,
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
          initialValue: 18,
          increasedPoints: 0,
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
          initialValue: 18,
          increasedPoints: -3,
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
          initialValue: 18,
          increasedPoints: 3,
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
          initialValue: 18,
          increasedPoints: 3,
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      const fakeResponse = structuredClone(fakeCharacterResponse);
      fakeResponse.Item.characterSheet.calculationPoints.attributePoints.available = 3;
      mockDynamoDBGetCharacterResponse(fakeResponse);

      await expectHttpError(() => increaseAttribute(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    {
      name: "Attribute has already been increased to the target value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          initialValue: 17,
          increasedPoints: 1,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase attribute by 1 point",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          initialValue: 18,
          increasedPoints: 1,
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Increase attribute by 3 point",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "attribute-name": "endurance",
        },
        queryStringParameters: null,
        body: {
          initialValue: 18,
          increasedPoints: 3,
        },
      },
      expectedStatusCode: 200,
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await increaseAttribute(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = JSON.parse(result.body);
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      const attributeName = _case.request.pathParameters["attribute-name"];
      expect(parsedBody.attributeName).toBe(attributeName);
      expect(parsedBody.attribute.new.current).toBe(
        _case.request.body.initialValue + _case.request.body.increasedPoints,
      );

      const attributeOld = getAttribute(fakeCharacterResponse.Item.characterSheet.attributes, attributeName);
      const oldTotalAttributeCost = attributeOld.totalCost;
      const diffAttributeTotalCost = parsedBody.attribute.new.totalCost - oldTotalAttributeCost;
      const oldAvailableAttributePoints =
        fakeCharacterResponse.Item.characterSheet.calculationPoints.attributePoints.available;
      const diffAvailableAttributePoints = oldAvailableAttributePoints - parsedBody.attributePoints.new.available;
      expect(diffAvailableAttributePoints).toBe(diffAttributeTotalCost);

      expect(parsedBody.attribute.old).toStrictEqual(attributeOld);

      // Attribute was not already at the target value
      if (_case.request.body.initialValue + _case.request.body.increasedPoints !== attributeOld.current) {
        // Check if the attribute was updated
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

      /**
       * TODO add a check for all tests across all Lambdas to validate the response body against the corresponding API schema (zod)
       * Or better add integration tests against the API in API Gateway?! The response body of the Lambda is not the same as the response body of the API Gateway.
       */
    });
  });
});
