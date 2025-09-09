import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "../test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "../test-data/response.js";
import { fakeCharacterId } from "../test-data/character.js";
import { updateBaseValueResponseSchema } from "api-spec";
import { getBaseValue } from "config";
import { _updateBaseValue } from "update-base-value";
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
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          byLvlUp: {
            initialValue: 23,
            newValue: 26,
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
          byLvlUp: {
            initialValue: 23,
            newValue: 26,
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
      name: "Passed initial byLvlUp value doesn't match the value in the backend",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          byLvlUp: {
            initialValue: 10,
            newValue: 15,
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
          byLvlUp: {
            initialValue: 23,
            newValue: 26,
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
          byLvlUp: {
            initialValue: 23,
            newValue: 26,
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
          byLvlUp: {
            initialValue: 23,
            newValue: 26,
          },
        },
      },
      expectedStatusCode: 404,
    },
    {
      name: "No byLvlUp change allowed for base value 'mentalHealth'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "mentalHealth",
        },
        queryStringParameters: null,
        body: {
          byLvlUp: {
            initialValue: 0,
            newValue: 2,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "No byLvlUp change allowed for base value 'attackBaseValue'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "attackBaseValue",
        },
        queryStringParameters: null,
        body: {
          byLvlUp: {
            initialValue: 0,
            newValue: 2,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "No byLvlUp change allowed for base value 'paradeBaseValue'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "paradeBaseValue",
        },
        queryStringParameters: null,
        body: {
          byLvlUp: {
            initialValue: 0,
            newValue: 2,
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "No byLvlUp change allowed for base value 'rangedAttackBaseValue'",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "rangedAttackBaseValue",
        },
        queryStringParameters: null,
        body: {
          byLvlUp: {
            initialValue: 0,
            newValue: 2,
          },
        },
      },
      expectedStatusCode: 409,
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
            initialValue: 30,
            newValue: 40,
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Base value has already been updated to the target byLvlUp value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          byLvlUp: {
            initialValue: 20,
            newValue: 23,
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
            initialValue: 3,
            newValue: 10,
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
      expect(parsedBody.baseValue.old).toStrictEqual(baseValueOld);
      expect(parsedBody.baseValue.new).toStrictEqual(parsedBody.baseValue.old);

      if (_case.request.body.start) {
        expect(parsedBody.baseValue.new.start).toBe(_case.request.body.start.newValue);
      }

      if (_case.request.body.byLvlUp) {
        expect(parsedBody.baseValue.new.byLvlUp).toBe(_case.request.body.byLvlUp.newValue);
      }

      if (_case.request.body.mod) {
        expect(parsedBody.baseValue.new.mod).toBe(_case.request.body.mod.newValue);
      }
    });
  });

  const updateTestCases = [
    {
      name: "Update start value",
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
      name: "Update byLvlUp value",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
          "base-value-name": "healthPoints",
        },
        queryStringParameters: null,
        body: {
          byLvlUp: {
            initialValue: 23,
            newValue: 26,
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
      name: "Update all values (start, byLvlUp, mod)",
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
          byLvlUp: {
            initialValue: 23,
            newValue: 25,
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

  updateTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateBaseValue(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateBaseValueResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      const baseValueName = _case.request.pathParameters["base-value-name"];
      expect(parsedBody.baseValueName).toBe(baseValueName);

      const baseValueOld = getBaseValue(fakeCharacterResponse.Item.characterSheet.baseValues, baseValueName);
      expect(parsedBody.baseValue.old).toStrictEqual(baseValueOld);

      if (_case.request.body.start) {
        expect(parsedBody.baseValue.new.start).toBe(_case.request.body.start.newValue);
      }

      if (_case.request.body.byLvlUp) {
        expect(parsedBody.baseValue.new.byLvlUp).toBe(_case.request.body.byLvlUp.newValue);
        const diffByLvlUp = (parsedBody.baseValue.new.byLvlUp ?? 0) - (parsedBody.baseValue.old.byLvlUp ?? 0);
        const diffCurrent = parsedBody.baseValue.new.current - parsedBody.baseValue.old.current;
        expect(diffByLvlUp).toBe(diffCurrent);
        expect(parsedBody.baseValue.new.current).toBe(parsedBody.baseValue.old.current + diffByLvlUp);
      } else {
        expect(parsedBody.baseValue.new.current).toBe(baseValueOld.current);
      }

      if (_case.request.body.mod) {
        expect(parsedBody.baseValue.new.mod).toBe(_case.request.body.mod.newValue);
      }

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
});
