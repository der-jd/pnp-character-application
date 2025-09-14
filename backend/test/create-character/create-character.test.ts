import { describe, expect, test } from "vitest";
import { fakeHeaders } from "../test-data/request.js";
import {
  fakeCharacterResponse,
  fakeHistoryBlockListResponse,
  mockDynamoDBGetCharacterResponse,
  mockDynamoDBQueryHistoryResponse,
} from "../test-data/response.js";
import { AdvantagesNames, createCharacterResponseSchema, DisadvantagesNames, PostCharactersRequest } from "api-spec";
import { _createCharacter } from "create-character";
import { expectHttpError } from "../utils.js";

const characterCreationRequest: PostCharactersRequest = {
  generalInformation: {
    name: "Test Character",
    sex: "male",
    profession: {
      name: "Warrior",
      skill: "combat/slashingWeaponsBlunt2h",
    },
    hobby: {
      name: "Fishing",
      skill: "nature/fishing",
    },
    birthday: "1990-01-01",
    birthplace: "Durotar",
    size: "185 cm",
    weight: "90 kg",
    hairColor: "Brown",
    eyeColor: "Blue",
    residence: "Orgrimmar City",
    appearance: "Tall and strong",
    specialCharacteristics: "None",
    level: 1,
  },
  attributes: {
    courage: {
      current: 5,
    },
    intelligence: {
      current: 5,
    },
    concentration: {
      current: 5,
    },
    charisma: {
      current: 5,
    },
    mentalResilience: {
      current: 5,
    },
    dexterity: {
      current: 5,
    },
    endurance: {
      current: 5,
    },
    strength: {
      current: 5,
    },
  },
  advantages: [
    [AdvantagesNames.BRAVE, "", 2],
    [AdvantagesNames.ATHLETIC, "", 4],
  ],
  disadvantages: [
    [DisadvantagesNames.VENGEFUL, "", 2],
    [DisadvantagesNames.FEAR_OF, "Heights", 2],
  ],
  activatedSkills: [
    "handcraft/makingMusic",
    "handcraft/alcoholProduction",
    "handcraft/fineMechanics",
    "social/convincing",
    "nature/trapping",
  ],
};

describe("Invalid requests", () => {
  const invalidTestCases = [
    {
      name: "Authorization header is missing",
      request: {
        headers: {},
        pathParameters: null,
        queryStringParameters: null,
        body: characterCreationRequest,
      },
      expectedStatusCode: 400,
    },
    {
      name: "Authorization header is malformed",
      request: {
        headers: {
          authorization: "dummyValue",
        },
        pathParameters: null,
        queryStringParameters: null,
        body: characterCreationRequest,
      },
      expectedStatusCode: 401,
    },
    {
      name: "Authorization token is invalid",
      request: {
        headers: {
          authorization: "Bearer 1234567890",
        },
        pathParameters: null,
        queryStringParameters: null,
        body: characterCreationRequest,
      },
      expectedStatusCode: 401,
    },
    {
      name: "Character Level is not min Level",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          generalInformation: {
            ...characterCreationRequest.generalInformation,
            level: 0,
          },
        },
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      await expectHttpError(() => _createCharacter(_case.request), _case.expectedStatusCode);
    });
  });
});

describe("Valid requests", () => {
  const validTestCases = [
    {
      name: "Copy an own character",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: characterCreationRequest,
      },
      expectedStatusCode: 200,
    },
    {
      name: "Copy another character",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: characterCreationRequest,
      },
      expectedStatusCode: 200,
    },
  ];

  validTestCases.forEach((_case) => {
    test(_case.name, async () => {
      mockDynamoDBGetCharacterResponse(fakeCharacterResponse);
      mockDynamoDBQueryHistoryResponse(fakeHistoryBlockListResponse);

      const result = await _createCharacter(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = createCharacterResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.changes.new.character.characterId).toBeDefined();
    });
  });
});
