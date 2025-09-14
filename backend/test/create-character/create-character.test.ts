import { describe, expect, test } from "vitest";
import { fakeHeaders } from "../test-data/request.js";
import {
  fakeCharacterResponse,
  fakeHistoryBlockListResponse,
  mockDynamoDBGetCharacterResponse,
  mockDynamoDBQueryHistoryResponse,
} from "../test-data/response.js";
import {
  AdvantagesNames,
  createCharacterResponseSchema,
  DisadvantagesNames,
  MAX_ATTRIBUTE_VALUE_FOR_CREATION,
  MIN_ATTRIBUTE_VALUE_FOR_CREATION,
  NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION,
  PostCharactersRequest,
} from "api-spec";
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
    {
      name: "Profession skill has the wrong format",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          generalInformation: {
            ...characterCreationRequest.generalInformation,
            profession: {
              ...characterCreationRequest.generalInformation.profession,
              skill: "slashingWeaponsBlunt2h",
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Hobby skill has the wrong format",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          generalInformation: {
            ...characterCreationRequest.generalInformation,
            hobby: {
              ...characterCreationRequest.generalInformation.hobby,
              skill: "fishing",
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Attribute value below the min value for new characters",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          attributes: {
            ...characterCreationRequest.attributes,
            courage: {
              current: MIN_ATTRIBUTE_VALUE_FOR_CREATION - 1,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Attribute value above the max value for new characters",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          attributes: {
            ...characterCreationRequest.attributes,
            courage: {
              current: MAX_ATTRIBUTE_VALUE_FOR_CREATION + 1,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Spent more attribute points than available for new characters",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          attributes: {
            ...characterCreationRequest.attributes,
            courage: {
              current: 6,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Spent less attribute points than available for new characters",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          attributes: {
            ...characterCreationRequest.attributes,
            courage: {
              current: 4,
            },
          },
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid advantage enum value (string instead of number)",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          advantages: [["BRAVE", "", 2]],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid disadvantage enum value (string instead of number)",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          disadvantages: [["VENGEFUL", "", 2]],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid advantage enum value (number above max enum value)",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          advantages: [
            // Add a value above the max enum value for demonstration
            [999, "", 2],
          ],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid disadvantage enum value (number above max enum value)",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          disadvantages: [
            // Add a value above the max enum value for demonstration
            [999, "", 2],
          ],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid cost for an advantage",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          advantages: [[AdvantagesNames.BRAVE, "", 5]],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Invalid cost for a disadvantage",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          disadvantages: [[DisadvantagesNames.VENGEFUL, "", 5]],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Spent more generation points than available",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          advantages: [
            [AdvantagesNames.BRAVE, "", 2],
            [AdvantagesNames.ATHLETIC, "", 4],
            [AdvantagesNames.CHARMER, "", 5],
          ],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Generation points through disadvantages exceed maximum allowed",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          disadvantages: [
            [DisadvantagesNames.VENGEFUL, "", 2],
            [DisadvantagesNames.FEAR_OF, "Heights", 2],
            [DisadvantagesNames.FEAR_OF, "crowd of people", 5],
            [DisadvantagesNames.QUARRELSOME, "", 5],
            [DisadvantagesNames.IMPULSIVE, "", 3],
          ],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Activated skills have the wrong format",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          activatedSkills: ["makingMusic", "alcoholProduction", "fineMechanics", "convincing", "trapping"],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: `Number of activated skills are above the required number of ${NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION}`,
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          activatedSkills: [
            "handcraft/makingMusic",
            "handcraft/alcoholProduction",
            "handcraft/fineMechanics",
            "social/convincing",
            "nature/trapping",
            "handcraft/stonework",
          ],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: `Number of activated skills are below the required number of ${NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION}`,
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          activatedSkills: [
            "handcraft/makingMusic",
            "handcraft/alcoholProduction",
            "handcraft/fineMechanics",
            "social/convincing",
          ],
        },
      },
      expectedStatusCode: 400,
    },
    {
      name: "Activated skill is already activated",
      request: {
        headers: fakeHeaders,
        pathParameters: null,
        queryStringParameters: null,
        body: {
          ...characterCreationRequest,
          activatedSkills: [
            "handcraft/makingMusic",
            "handcraft/alcoholProduction",
            "handcraft/fineMechanics",
            "social/convincing",
            "combat/daggers",
          ],
        },
      },
      expectedStatusCode: 400,
    },
  ];

  invalidTestCases.forEach((_case) => {
    test(_case.name, async () => {
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
