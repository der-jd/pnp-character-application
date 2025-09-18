import { describe, expect, test } from "vitest";
import { fakeHeaders, fakeUserId } from "../test-data/request.js";
import {
  AdvantagesNames,
  Attributes,
  createCharacterResponseSchema,
  DisadvantagesNames,
  MAX_ATTRIBUTE_VALUE_FOR_CREATION,
  MIN_ATTRIBUTE_VALUE_FOR_CREATION,
  NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION,
  PostCharactersRequest,
  PROFESSION_SKILL_BONUS,
  HOBBY_SKILL_BONUS,
  START_SKILLS,
  GENERATION_POINTS,
  SkillCategory,
  baseValuesUpdatableByLvlUp,
  BaseValues,
  ATTRIBUTE_POINTS_FOR_CREATION,
  CombatSkillName,
} from "api-spec";
import { _createCharacter } from "create-character";
import { expectHttpError } from "../utils.js";
import {
  getSkill,
  getSkillCategoryAndName,
  COST_CATEGORY_COMBAT_SKILLS,
  COST_CATEGORY_DEFAULT,
  getCombatSkillHandling,
} from "core";

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
      name: "Create a new character",
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
      const result = await _createCharacter(_case.request);

      expect(result.statusCode).toBe(_case.expectedStatusCode);

      const parsedBody = createCharacterResponseSchema.parse(JSON.parse(result.body));
      expect(parsedBody.characterId).toBeDefined();
      expect(parsedBody.userId).toBe(fakeUserId);
      expect(parsedBody.characterName).toBe(_case.request.body.generalInformation.name);

      expect(parsedBody.changes.new.character).toBeDefined();
      expect(parsedBody.changes.new.character.userId).toBe(fakeUserId);

      expect(parsedBody.changes.new.character.characterSheet.generalInformation).toStrictEqual(
        _case.request.body.generalInformation,
      );

      // Attributes should be set according to the request
      for (const attributeName in _case.request.body.attributes) {
        const attribute = parsedBody.changes.new.character.characterSheet.attributes[attributeName as keyof Attributes];
        const requestAttribute = (_case.request.body.attributes as Record<string, any>)[attributeName];

        expect(attribute.start).toBe(requestAttribute.current);
        expect(attribute.current).toBe(requestAttribute.current);
        expect(attribute.totalCost).toBe(requestAttribute.current);
      }

      // Advantages and Disadvantages should be copied
      expect(parsedBody.changes.new.character.characterSheet.advantages).toStrictEqual(_case.request.body.advantages);
      expect(parsedBody.changes.new.character.characterSheet.disadvantages).toStrictEqual(
        _case.request.body.disadvantages,
      );

      // Check profession and Hobby
      const profession = _case.request.body.generalInformation.profession;
      const hobby = _case.request.body.generalInformation.hobby;
      expect(parsedBody.changes.new.character.characterSheet.generalInformation.profession.name).toBe(profession.name);
      expect(parsedBody.changes.new.character.characterSheet.generalInformation.hobby.name).toBe(hobby.name);
      expect(parsedBody.changes.new.character.characterSheet.generalInformation.profession.skill).toStrictEqual(
        profession.skill,
      );
      expect(parsedBody.changes.new.character.characterSheet.generalInformation.hobby.skill).toStrictEqual(hobby.skill);

      const { category: professionCategory, name: professionSkillName } = getSkillCategoryAndName(profession.skill);
      const { category: hobbyCategory, name: hobbySkillName } = getSkillCategoryAndName(hobby.skill);
      const returnedProfessionSkill = getSkill(
        parsedBody.changes.new.character.characterSheet.skills,
        professionCategory,
        professionSkillName,
      );
      const returnedHobbySkill = getSkill(
        parsedBody.changes.new.character.characterSheet.skills,
        hobbyCategory,
        hobbySkillName,
      );
      expect(returnedProfessionSkill.activated).toBe(true);
      expect(returnedHobbySkill.activated).toBe(true);
      expect(returnedProfessionSkill.mod).toBe(PROFESSION_SKILL_BONUS);
      expect(returnedHobbySkill.mod).toBe(HOBBY_SKILL_BONUS);

      // Check activated skills
      const activatedSkills = _case.request.body.activatedSkills;
      activatedSkills.forEach((skill) => {
        const { category, name } = getSkillCategoryAndName(skill);
        const skillDetails = getSkill(parsedBody.changes.new.character.characterSheet.skills, category, name);
        expect(skillDetails.activated).toBe(true);
      });
      expect(parsedBody.changes.new.activatedSkills).toStrictEqual(_case.request.body.activatedSkills);

      // All start skills should be activated
      START_SKILLS.forEach((skill) => {
        const { category, name } = getSkillCategoryAndName(skill);
        const skillDetails = getSkill(parsedBody.changes.new.character.characterSheet.skills, category, name);
        expect(skillDetails.activated).toBe(true);
      });

      // Check that skills are initialized correctly
      const combatSkillCategory: SkillCategory = "combat";
      Object.entries(parsedBody.changes.new.character.characterSheet.skills).forEach(([category, skillsInCategory]) => {
        Object.entries(skillsInCategory).forEach(([, skillDetails]) => {
          expect(skillDetails.start).toBe(0);
          expect(skillDetails.current).toBe(0);
          expect(skillDetails.totalCost).toBe(0);
          if (category === combatSkillCategory) {
            expect(skillDetails.defaultCostCategory).toBe(COST_CATEGORY_COMBAT_SKILLS);
          } else {
            expect(skillDetails.defaultCostCategory).toBe(COST_CATEGORY_DEFAULT);
          }
        });
      });

      // Check combat values
      Object.entries(parsedBody.changes.new.character.characterSheet.combatValues).forEach(
        ([, combatValuesInCategory]) => {
          Object.entries(combatValuesInCategory).forEach(([name, details]) => {
            expect(details.availablePoints).toBe(getCombatSkillHandling(name as CombatSkillName)); // TODO must be handling + initial skill (to be rolled) + corresponding-skill.current + corresponding-skill.mod
            expect(details.handling).toBe(getCombatSkillHandling(name as CombatSkillName));
            expect(details.attackValue).toBe(0);
            expect(details.paradeValue).toBe(0);
          });
        },
      );

      // Check attribute points
      expect(parsedBody.changes.new.character.characterSheet.calculationPoints.attributePoints.start).toBe(
        ATTRIBUTE_POINTS_FOR_CREATION,
      );
      expect(parsedBody.changes.new.character.characterSheet.calculationPoints.attributePoints.available).toBe(0);
      expect(parsedBody.changes.new.character.characterSheet.calculationPoints.attributePoints.total).toBe(
        ATTRIBUTE_POINTS_FOR_CREATION,
      );

      // Check adventure points
      expect(parsedBody.changes.new.character.characterSheet.calculationPoints.adventurePoints.start).toBe(0);
      expect(parsedBody.changes.new.character.characterSheet.calculationPoints.adventurePoints.available).toBe(0);
      expect(parsedBody.changes.new.character.characterSheet.calculationPoints.adventurePoints.total).toBe(0);

      // Check special abilities
      expect(parsedBody.changes.new.character.characterSheet.specialAbilities).toStrictEqual([]);

      // Check that base values are initialized correctly
      Object.entries(parsedBody.changes.new.character.characterSheet.baseValues).forEach(
        ([baseValueName, baseValue]) => {
          expect(baseValue.byFormula).toBe(baseValue.current);
          expect(baseValue.current).toBe(baseValue.start);
          if (baseValuesUpdatableByLvlUp.includes(baseValueName as keyof BaseValues)) {
            expect(baseValue.byLvlUp).toBe(0);
          } else {
            expect(baseValue.byLvlUp).toBeUndefined();
          }
        },
      );

      // Generation points should be calculated according to the input advantages and disadvantages
      const generationPointsThroughDisadvantages = _case.request.body.disadvantages.reduce(
        (sum, [, , value]) => sum + value,
        0,
      );
      expect(parsedBody.changes.new.generationPoints.throughDisadvantages).toBe(generationPointsThroughDisadvantages);
      const spentGenerationPoints = _case.request.body.advantages.reduce((sum, [, , value]) => sum + value, 0);
      expect(parsedBody.changes.new.generationPoints.spent).toBe(spentGenerationPoints);
      expect(parsedBody.changes.new.generationPoints.total).toBe(
        GENERATION_POINTS + generationPointsThroughDisadvantages,
      );
    });
  });
});
