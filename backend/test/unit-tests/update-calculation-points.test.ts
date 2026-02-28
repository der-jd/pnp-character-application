import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "./test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "./test-data/response.js";
import { fakeCharacter, fakeCharacterId } from "./test-data/character.js";
import { updateCalculationPointsResponseSchema } from "api-spec";
import { _updateCalculationPoints } from "update-calculation-points";
import { expectHttpError } from "./utils.js";

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: {
        headers: {},
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            total: {
              initialValue: 300,
              increasedPoints: 100,
            },
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
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            total: {
              initialValue: 300,
              increasedPoints: 100,
            },
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
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            total: {
              initialValue: 300,
              increasedPoints: 100,
            },
          },
        },
      },
      expectedStatusCode: 401,
    },
    {
      name: "Passed initial start value doesn't match the value in the backend (adventure points)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            start: {
              initialValue: 50,
              newValue: 0,
            },
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Passed initial start value doesn't match the value in the backend (attribute points)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          attributePoints: {
            start: {
              initialValue: 8,
              newValue: 15,
            },
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Passed initial total value doesn't match the value in the backend (adventure points)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            total: {
              initialValue: 200,
              increasedPoints: 50,
            },
          },
        },
      },
      expectedStatusCode: 409,
    },
    {
      name: "Passed initial total value doesn't match the value in the backend (attribute points)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          attributePoints: {
            total: {
              initialValue: 25,
              increasedPoints: 10,
            },
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
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            total: {
              initialValue: 300,
              increasedPoints: 100,
            },
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
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            total: {
              initialValue: 300,
              increasedPoints: 100,
            },
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
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            total: {
              initialValue: 300,
              increasedPoints: 100,
            },
          },
        },
      },
      expectedStatusCode: 404,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _updateCalculationPoints(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const idempotentTestCases = [
    {
      name: "Adventure points start value has already been updated to the target value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            start: {
              initialValue: fakeCharacter.characterSheet.calculationPoints.adventurePoints.start - 20,
              newValue: fakeCharacter.characterSheet.calculationPoints.adventurePoints.start,
            },
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Attribute points start value has already been updated to the target value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          attributePoints: {
            start: {
              initialValue: fakeCharacter.characterSheet.calculationPoints.attributePoints.start - 5,
              newValue: fakeCharacter.characterSheet.calculationPoints.attributePoints.start,
            },
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Total adventure points have already been updated to the target value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            total: {
              initialValue: fakeCharacter.characterSheet.calculationPoints.adventurePoints.total - 100,
              increasedPoints: 100,
            },
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Total attribute points have already been updated to the target value (idempotency)",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          attributePoints: {
            total: {
              initialValue: fakeCharacter.characterSheet.calculationPoints.attributePoints.total - 20,
              increasedPoints: 20,
            },
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  idempotentTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateCalculationPoints(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateCalculationPointsResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.userId).toBe(fakeUserId);

      expect(parsedBody.calculationPoints.new).toStrictEqual(parsedBody.calculationPoints.old);

      if (_case.request.body.adventurePoints) {
        expect(parsedBody.calculationPoints.old.adventurePoints).toStrictEqual(
          fakeCharacterResponse.Item.characterSheet.calculationPoints.adventurePoints,
        );

        if (_case.request.body.adventurePoints.start) {
          expect(parsedBody.calculationPoints.new.adventurePoints?.start).toBe(
            _case.request.body.adventurePoints.start.newValue,
          );
        }

        if (_case.request.body.adventurePoints.total) {
          const diffAvailable =
            parsedBody.calculationPoints.new.adventurePoints!.available -
            parsedBody.calculationPoints.old.adventurePoints!.available;
          const diffTotal =
            parsedBody.calculationPoints.new.adventurePoints!.total -
            parsedBody.calculationPoints.old.adventurePoints!.total;
          expect(diffAvailable).toBe(diffTotal);
          expect(parsedBody.calculationPoints.new.adventurePoints?.total).toBe(
            _case.request.body.adventurePoints.total.initialValue +
              _case.request.body.adventurePoints.total.increasedPoints,
          );
        }
      }

      if (_case.request.body.attributePoints) {
        expect(parsedBody.calculationPoints.old.attributePoints).toStrictEqual(
          fakeCharacterResponse.Item.characterSheet.calculationPoints.attributePoints,
        );

        if (_case.request.body.attributePoints.start) {
          expect(parsedBody.calculationPoints.new.attributePoints?.start).toBe(
            _case.request.body.attributePoints.start.newValue,
          );
        }

        if (_case.request.body.attributePoints.total) {
          const diffAvailable =
            parsedBody.calculationPoints.new.attributePoints!.available -
            parsedBody.calculationPoints.old.attributePoints!.available;
          const diffTotal =
            parsedBody.calculationPoints.new.attributePoints!.total -
            parsedBody.calculationPoints.old.attributePoints!.total;
          expect(diffAvailable).toBe(diffTotal);
          expect(parsedBody.calculationPoints.new.attributePoints?.total).toBe(
            _case.request.body.attributePoints.total.initialValue +
              _case.request.body.attributePoints.total.increasedPoints,
          );
        }
      }
    });
  });

  const updateTestCases = [
    {
      name: "Update adventure points start value",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            start: {
              initialValue: 100,
              newValue: 0,
            },
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update attribute points start value",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          attributePoints: {
            start: {
              initialValue: 10,
              newValue: 40,
            },
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update total adventure points",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            total: {
              initialValue: 300,
              increasedPoints: 100,
            },
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update total attribute points",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          attributePoints: {
            total: {
              initialValue: 50,
              increasedPoints: 5,
            },
          },
        },
      },
      expectedStatusCode: 200,
    },
    {
      name: "Update all values (start and total) of adventure points and attribute points",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          adventurePoints: {
            start: {
              initialValue: 100,
              newValue: 150,
            },
            total: {
              initialValue: 300,
              increasedPoints: 200,
            },
          },
          attributePoints: {
            start: {
              initialValue: 10,
              newValue: 30,
            },
            total: {
              initialValue: 50,
              increasedPoints: 10,
            },
          },
        },
      },
      expectedStatusCode: 200,
    },
  ];

  updateTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      const result = await _updateCalculationPoints(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = updateCalculationPointsResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBe(_case.request.pathParameters["character-id"]);
      expect(parsedBody.userId).toBe(fakeUserId);

      if (_case.request.body.adventurePoints) {
        expect(parsedBody.calculationPoints.old.adventurePoints).toStrictEqual(
          fakeCharacterResponse.Item.characterSheet.calculationPoints.adventurePoints,
        );

        if (_case.request.body.adventurePoints.start) {
          expect(parsedBody.calculationPoints.new.adventurePoints?.start).toBe(
            _case.request.body.adventurePoints.start.newValue,
          );
        }

        if (_case.request.body.adventurePoints.total) {
          const diffAvailable =
            parsedBody.calculationPoints.new.adventurePoints!.available -
            parsedBody.calculationPoints.old.adventurePoints!.available;
          const diffTotal =
            parsedBody.calculationPoints.new.adventurePoints!.total -
            parsedBody.calculationPoints.old.adventurePoints!.total;
          expect(diffAvailable).toBe(diffTotal);
          expect(parsedBody.calculationPoints.new.adventurePoints?.total).toBe(
            _case.request.body.adventurePoints.total.initialValue +
              _case.request.body.adventurePoints.total.increasedPoints,
          );
        }
      }

      if (_case.request.body.attributePoints) {
        expect(parsedBody.calculationPoints.old.attributePoints).toStrictEqual(
          fakeCharacterResponse.Item.characterSheet.calculationPoints.attributePoints,
        );

        if (_case.request.body.attributePoints.start) {
          expect(parsedBody.calculationPoints.new.attributePoints?.start).toBe(
            _case.request.body.attributePoints.start.newValue,
          );
        }

        if (_case.request.body.attributePoints.total) {
          const diffAvailable =
            parsedBody.calculationPoints.new.attributePoints!.available -
            parsedBody.calculationPoints.old.attributePoints!.available;
          const diffTotal =
            parsedBody.calculationPoints.new.attributePoints!.total -
            parsedBody.calculationPoints.old.attributePoints!.total;
          expect(diffAvailable).toBe(diffTotal);
          expect(parsedBody.calculationPoints.new.attributePoints?.total).toBe(
            _case.request.body.attributePoints.total.initialValue +
              _case.request.body.attributePoints.total.increasedPoints,
          );
        }
      }

      if (!_case.request.body.adventurePoints) {
        expect(parsedBody.calculationPoints.old.adventurePoints).toBeUndefined();
        expect(parsedBody.calculationPoints.new.adventurePoints).toBeUndefined();
      }

      if (!_case.request.body.attributePoints) {
        expect(parsedBody.calculationPoints.old.attributePoints).toBeUndefined();
        expect(parsedBody.calculationPoints.new.attributePoints).toBeUndefined();
      }

      // Check for DynamoDB updates
      const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);

      // Calculation points are updated
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
});
