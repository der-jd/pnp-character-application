import { describe, expect, test } from "vitest";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fakeHeaders, dummyHeaders, fakeUserId } from "./test-data/request.js";
import { fakeCharacterResponse, mockDynamoDBGetCharacterResponse } from "./test-data/response.js";
import { fakeCharacter, fakeCharacterId } from "./test-data/character.js";
import { updateGeneralInformationResponseSchema } from "api-spec";
import { expectHttpError } from "./utils.js";
import { _updateGeneralInformation } from "update-general-information";

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
          name: "New Name",
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
          name: "New Name",
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
          name: "New Name",
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
        },
        queryStringParameters: null,
        body: {
          name: "New Name",
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
          name: "New Name",
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
          name: "New Name",
        },
      },
      expectedStatusCode: 404,
    },
    {
      name: "Request body contains unknown field",
      request: {
        headers: fakeHeaders,
        pathParameters: {
          "character-id": fakeCharacterId,
        },
        queryStringParameters: null,
        body: {
          name: "New Name",
          unknownField: "should fail",
        },
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

      await expectHttpError(() => _updateGeneralInformation(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  test("Update name only", async () => {
    mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

    const result = await _updateGeneralInformation({
      headers: fakeHeaders,
      pathParameters: {
        "character-id": fakeCharacterId,
      },
      queryStringParameters: null,
      body: {
        name: "New Character Name",
      },
    });

    expect(result.statusCode).toBe(200);

    const parsedBody = updateGeneralInformationResponseSchema.parse(JSON.parse(result.body));
    expect(parsedBody.userId).toBe(fakeUserId);
    expect(parsedBody.characterId).toBe(fakeCharacterId);

    // Old values should match original character
    expect(parsedBody.changes.old.generalInformation).toStrictEqual(fakeCharacter.characterSheet.generalInformation);

    // New values should have the updated name
    expect(parsedBody.changes.new.generalInformation.name).toBe("New Character Name");

    // Other fields should remain unchanged
    expect(parsedBody.changes.new.generalInformation.sex).toBe(fakeCharacter.characterSheet.generalInformation.sex);
    expect(parsedBody.changes.new.generalInformation.birthplace).toBe(
      fakeCharacter.characterSheet.generalInformation.birthplace,
    );

    // Character already at current version
    expect(parsedBody.versionUpdate).toBeUndefined();

    // Check for DynamoDB update call
    const calls = (globalThis as any).dynamoDBMock.commandCalls(UpdateCommand);
    expect(calls).toHaveLength(1);

    const matchingCall = calls.find((call: any) => {
      const input = call.args[0].input;
      return input.Key.characterId === fakeCharacterId && input.Key.userId === fakeUserId;
    });
    expect(matchingCall).toBeTruthy();
  });

  test("Update multiple fields", async () => {
    mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

    const result = await _updateGeneralInformation({
      headers: fakeHeaders,
      pathParameters: {
        "character-id": fakeCharacterId,
      },
      queryStringParameters: null,
      body: {
        birthplace: "New Birthplace",
        weight: "180 lbs",
        eyeColor: "Green",
        residence: "Mountain Keep",
      },
    });

    expect(result.statusCode).toBe(200);

    const parsedBody = updateGeneralInformationResponseSchema.parse(JSON.parse(result.body));
    expect(parsedBody.userId).toBe(fakeUserId);
    expect(parsedBody.characterId).toBe(fakeCharacterId);

    // Verify updated fields
    expect(parsedBody.changes.new.generalInformation.birthplace).toBe("New Birthplace");
    expect(parsedBody.changes.new.generalInformation.weight).toBe("180 lbs");
    expect(parsedBody.changes.new.generalInformation.eyeColor).toBe("Green");
    expect(parsedBody.changes.new.generalInformation.residence).toBe("Mountain Keep");

    // Verify untouched fields remain the same
    expect(parsedBody.changes.new.generalInformation.name).toBe(fakeCharacter.characterSheet.generalInformation.name);
    expect(parsedBody.changes.new.generalInformation.hairColor).toBe(
      fakeCharacter.characterSheet.generalInformation.hairColor,
    );
  });

  test("Update profession and hobby", async () => {
    mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

    const result = await _updateGeneralInformation({
      headers: fakeHeaders,
      pathParameters: {
        "character-id": fakeCharacterId,
      },
      queryStringParameters: null,
      body: {
        profession: { name: "Mage", skill: "magic/fireball" },
        hobby: { name: "Alchemy", skill: "crafting/alchemy" },
      },
    });

    expect(result.statusCode).toBe(200);

    const parsedBody = updateGeneralInformationResponseSchema.parse(JSON.parse(result.body));

    expect(parsedBody.changes.new.generalInformation.profession).toStrictEqual({
      name: "Mage",
      skill: "magic/fireball",
    });
    expect(parsedBody.changes.new.generalInformation.hobby).toStrictEqual({
      name: "Alchemy",
      skill: "crafting/alchemy",
    });
  });

  test("Idempotent request - sending same values as current", async () => {
    mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

    const gi = fakeCharacter.characterSheet.generalInformation;
    const result = await _updateGeneralInformation({
      headers: fakeHeaders,
      pathParameters: {
        "character-id": fakeCharacterId,
      },
      queryStringParameters: null,
      body: {
        name: gi.name,
        birthplace: gi.birthplace,
      },
    });

    expect(result.statusCode).toBe(200);

    const parsedBody = updateGeneralInformationResponseSchema.parse(JSON.parse(result.body));

    // Old and new should be identical
    expect(parsedBody.changes.old.generalInformation).toStrictEqual(parsedBody.changes.new.generalInformation);
  });

  test("Update appearance and special characteristics", async () => {
    mockDynamoDBGetCharacterResponse(fakeCharacterResponse);

    const result = await _updateGeneralInformation({
      headers: fakeHeaders,
      pathParameters: {
        "character-id": fakeCharacterId,
      },
      queryStringParameters: null,
      body: {
        appearance: "Short and stocky with a red beard",
        specialCharacteristics: "Missing left pinky finger",
      },
    });

    expect(result.statusCode).toBe(200);

    const parsedBody = updateGeneralInformationResponseSchema.parse(JSON.parse(result.body));

    expect(parsedBody.changes.new.generalInformation.appearance).toBe("Short and stocky with a red beard");
    expect(parsedBody.changes.new.generalInformation.specialCharacteristics).toBe("Missing left pinky finger");
  });
});
