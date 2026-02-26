import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  AdvantagesNames,
  Attributes,
  PostCharactersRequest,
  PostCharactersResponse,
  postCharactersResponseSchema,
  PostCharactersHistoryRecord,
  DisadvantagesNames,
  HistoryRecordType,
  SkillCategory,
  GENERATION_POINTS,
  ATTRIBUTE_POINTS_FOR_CREATION,
  PROFESSION_SKILL_BONUS,
  HOBBY_SKILL_BONUS,
  START_SKILLS,
  NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION,
  MIN_ATTRIBUTE_VALUE_FOR_CREATION,
  MAX_ATTRIBUTE_VALUE_FOR_CREATION,
  MAX_INITIAL_COMBAT_SKILL_VALUE,
  MIN_INITIAL_COMBAT_SKILL_VALUE,
  CombatSection,
} from "api-spec";
import { commonInvalidTestCases, expectApiError } from "./shared.js";
import { ApiClient } from "./api-client.js";
import { BaseSetup, TestContextFactory } from "./test-context-factory.js";

const characterCreationRequest: PostCharactersRequest = {
  generalInformation: {
    name: "Component Test Character Creation",
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
    levelUpProgress: {
      effectsByLevel: {},
      effects: {},
    },
  },
  attributes: {
    courage: { current: 5 },
    intelligence: { current: 5 },
    concentration: { current: 5 },
    charisma: { current: 5 },
    mentalResilience: { current: 5 },
    dexterity: { current: 5 },
    endurance: { current: 5 },
    strength: { current: 5 },
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
  combatSkillsStartValues: {
    martialArts: 1,
    barehanded: 1,
    chainWeapons: 1,
    daggers: 1,
    slashingWeaponsSharp1h: 1,
    slashingWeaponsBlunt1h: 1,
    thrustingWeapons1h: 1,
    slashingWeaponsSharp2h: 1,
    slashingWeaponsBlunt2h: 1,
    thrustingWeapons2h: 1,
    missile: 1,
    firearmSimple: 1,
    firearmMedium: 1,
    firearmComplex: 1,
    heavyWeapons: 1,
  },
};

describe.sequential("post-character component tests", () => {
  let baseSetup: BaseSetup;
  const createdCharacterIds: string[] = [];

  beforeAll(() => {
    baseSetup = TestContextFactory.getBaseSetup();
  });

  afterAll(async () => {
    for (const characterId of createdCharacterIds) {
      await TestContextFactory.deleteCharacter(baseSetup.apiClient, characterId);
    }
  });

  /**
   * =============================
   * Invalid requests
   * =============================
   */

  describe("Invalid requests", () => {
    // Test cases with characterId are not applicable for this endpoint
    const testCasesWithoutCharacterId = commonInvalidTestCases.filter((_case) => !_case.characterId);

    testCasesWithoutCharacterId.forEach((_case) => {
      test(_case.name, async () => {
        const authorizationHeader = _case.authorizationHeader ?? baseSetup.authorizationHeader;
        const client = new ApiClient(baseSetup.apiBaseUrl, authorizationHeader);

        await expectApiError(
          () => client.post("characters", characterCreationRequest),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    const invalidTestCases = [
      {
        name: "character level is not min level",
        body: {
          ...characterCreationRequest,
          generalInformation: {
            ...characterCreationRequest.generalInformation,
            level: 0,
          },
        },
        expectedStatusCode: 400,
      },
      {
        name: "profession skill has the wrong format (missing category)",
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
        expectedStatusCode: 400,
      },
      {
        name: "hobby skill has the wrong format (missing category)",
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
        expectedStatusCode: 400,
      },
      {
        name: "attribute value below the min value for new characters",
        body: {
          ...characterCreationRequest,
          attributes: {
            ...characterCreationRequest.attributes,
            courage: { current: MIN_ATTRIBUTE_VALUE_FOR_CREATION - 1 },
          },
        },
        expectedStatusCode: 400,
      },
      {
        name: "attribute value above the max value for new characters",
        body: {
          ...characterCreationRequest,
          attributes: {
            ...characterCreationRequest.attributes,
            courage: { current: MAX_ATTRIBUTE_VALUE_FOR_CREATION + 1 },
          },
        },
        expectedStatusCode: 400,
      },
      {
        name: "spent more attribute points than available for new characters",
        body: {
          ...characterCreationRequest,
          attributes: {
            ...characterCreationRequest.attributes,
            courage: { current: characterCreationRequest.attributes.courage.current + 1 },
          },
        },
        expectedStatusCode: 400,
      },
      {
        name: "spent less attribute points than available for new characters",
        body: {
          ...characterCreationRequest,
          attributes: {
            ...characterCreationRequest.attributes,
            courage: { current: characterCreationRequest.attributes.courage.current - 1 },
          },
        },
        expectedStatusCode: 400,
      },
      {
        name: "invalid advantage enum value (string instead of number)",
        body: {
          ...characterCreationRequest,
          advantages: [["BRAVE", "", 2]],
        },
        expectedStatusCode: 400,
      },
      {
        name: "invalid disadvantage enum value (string instead of number)",
        body: {
          ...characterCreationRequest,
          disadvantages: [["VENGEFUL", "", 2]],
        },
        expectedStatusCode: 400,
      },
      {
        name: "invalid advantage enum value (number above max enum value)",
        body: {
          ...characterCreationRequest,
          advantages: [[999, "", 2]],
        },
        expectedStatusCode: 400,
      },
      {
        name: "invalid disadvantage enum value (number above max enum value)",
        body: {
          ...characterCreationRequest,
          disadvantages: [[999, "", 2]],
        },
        expectedStatusCode: 400,
      },
      {
        name: "invalid cost for an advantage",
        body: {
          ...characterCreationRequest,
          advantages: [[AdvantagesNames.BRAVE, "", 5]],
        },
        expectedStatusCode: 400,
      },
      {
        name: "invalid cost for a disadvantage",
        body: {
          ...characterCreationRequest,
          disadvantages: [[DisadvantagesNames.VENGEFUL, "", 5]],
        },
        expectedStatusCode: 400,
      },
      {
        name: "spent more generation points than available",
        body: {
          ...characterCreationRequest,
          advantages: [
            [AdvantagesNames.BRAVE, "", 2],
            [AdvantagesNames.ATHLETIC, "", 4],
            [AdvantagesNames.CHARMER, "", 5],
          ],
        },
        expectedStatusCode: 400,
      },
      {
        name: "generation points through disadvantages exceed maximum allowed",
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
        expectedStatusCode: 400,
      },
      {
        name: "activated skills have the wrong format (missing category)",
        body: {
          ...characterCreationRequest,
          activatedSkills: ["makingMusic", "alcoholProduction", "fineMechanics", "convincing", "trapping"],
        },
        expectedStatusCode: 400,
      },
      {
        name: `number of activated skills are above the required number of ${NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION}`,
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
        expectedStatusCode: 400,
      },
      {
        name: `number of activated skills are below the required number of ${NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION}`,
        body: {
          ...characterCreationRequest,
          activatedSkills: [
            "handcraft/makingMusic",
            "handcraft/alcoholProduction",
            "handcraft/fineMechanics",
            "social/convincing",
          ],
        },
        expectedStatusCode: 400,
      },
      {
        name: "activated skill is already activated",
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
        expectedStatusCode: 400,
      },
      {
        name: "start value of combat skill is above maximum allowed",
        body: {
          ...characterCreationRequest,
          combatSkillsStartValues: {
            ...characterCreationRequest.combatSkillsStartValues,
            daggers: MAX_INITIAL_COMBAT_SKILL_VALUE + 1,
          },
        },
        expectedStatusCode: 400,
      },
      {
        name: "start value of combat skill is below minimum allowed",
        body: {
          ...characterCreationRequest,
          combatSkillsStartValues: {
            ...characterCreationRequest.combatSkillsStartValues,
            daggers: MIN_INITIAL_COMBAT_SKILL_VALUE - 1,
          },
        },
        expectedStatusCode: 400,
      },
    ];

    invalidTestCases.forEach((_case) => {
      test(_case.name, async () => {
        await expectApiError(() => baseSetup.apiClient.post("characters", _case.body), _case.expectedStatusCode);
      });
    });
  });

  /**
   * =============================
   * Valid requests
   * =============================
   */

  describe("Valid requests", () => {
    test("create a new character", async () => {
      const body = characterCreationRequest;

      const response: PostCharactersResponse = postCharactersResponseSchema.parse(
        await baseSetup.apiClient.post("characters", body),
      );
      createdCharacterIds.push(response.data.characterId);

      expect(response.data.characterId).toBeDefined();
      expect(response.data.userId).toBe(baseSetup.userId);
      expect(response.data.characterName).toBe(body.generalInformation.name);

      const createdCharacter = response.data.changes.new.character;
      expect(createdCharacter).toBeDefined();
      expect(createdCharacter.userId).toBe(response.data.userId);

      // General Information should be copied
      expect(createdCharacter.characterSheet.generalInformation).toStrictEqual(body.generalInformation);

      // Attributes should be set according to the request
      for (const attributeName in body.attributes) {
        const attribute = createdCharacter.characterSheet.attributes[attributeName as keyof Attributes];
        const requestedValue = (body.attributes as Record<string, { current: number }>)[attributeName].current;

        expect(attribute.start).toBe(requestedValue);
        expect(attribute.current).toBe(requestedValue);
        expect(attribute.totalCost).toBe(requestedValue);
      }

      // Advantages and Disadvantages should be copied
      expect(createdCharacter.characterSheet.advantages).toStrictEqual(body.advantages);
      expect(createdCharacter.characterSheet.disadvantages).toStrictEqual(body.disadvantages);

      // Profession and Hobby should be copied
      const professionSkill = body.generalInformation.profession.skill;
      const hobbySkill = body.generalInformation.hobby.skill;
      const [professionCategory, professionSkillName] = professionSkill.split("/");
      const [hobbyCategory, hobbySkillName] = hobbySkill.split("/");

      const professionSkillDetails = (
        createdCharacter.characterSheet.skills as Record<string, Record<string, { activated: boolean; mod: number }>>
      )[professionCategory][professionSkillName];
      const hobbySkillDetails = (
        createdCharacter.characterSheet.skills as Record<string, Record<string, { activated: boolean; mod: number }>>
      )[hobbyCategory][hobbySkillName];

      expect(professionSkillDetails.activated).toBe(true);
      expect(hobbySkillDetails.activated).toBe(true);
      expect(professionSkillDetails.mod).toBe(PROFESSION_SKILL_BONUS);
      expect(hobbySkillDetails.mod).toBe(HOBBY_SKILL_BONUS);

      // Activated Skills should be copied
      const activatedSkills = body.activatedSkills;
      activatedSkills.forEach((skill) => {
        const [category, name] = skill.split("/");
        const skillDetails = (
          createdCharacter.characterSheet.skills as Record<string, Record<string, { activated: boolean }>>
        )[category][name];
        expect(skillDetails.activated).toBe(true);
      });
      expect(response.data.changes.new.activatedSkills).toStrictEqual(body.activatedSkills);

      // All start skills should be activated
      START_SKILLS.forEach((skill) => {
        const [category, name] = skill.split("/");
        const skillDetails = (
          createdCharacter.characterSheet.skills as Record<string, Record<string, { activated: boolean }>>
        )[category][name];
        expect(skillDetails.activated).toBe(true);
      });

      // Check that skills are initialized correctly
      const combatSkillCategory: SkillCategory = "combat";
      Object.entries(createdCharacter.characterSheet.skills).forEach(([category, skillsInCategory]) => {
        Object.entries(skillsInCategory).forEach(([name, skillDetails]) => {
          expect(skillDetails.totalCost).toBe(0);
          if (category === combatSkillCategory) {
            const expectedStartValue = (body.combatSkillsStartValues as Record<string, number>)[name];
            expect(skillDetails.start).toBe(expectedStartValue);
            expect(skillDetails.current).toBe(expectedStartValue);
          } else {
            expect(skillDetails.start).toBe(0);
            expect(skillDetails.current).toBe(0);
          }
        });
      });

      // Check combat stats
      const rangedCombatCategory: keyof CombatSection = "ranged";
      Object.entries(createdCharacter.characterSheet.combat).forEach(([category, combatStatsInCategory]) => {
        Object.entries(combatStatsInCategory).forEach(([name, combatStats]) => {
          if (`combat/${name}` === body.generalInformation.profession.skill) {
            expect(combatStats.availablePoints).toBe(
              combatStats.handling + body.combatSkillsStartValues[name] + PROFESSION_SKILL_BONUS,
            );
          } else if (`combat/${name}` === body.generalInformation.hobby.skill) {
            expect(combatStats.availablePoints).toBe(
              combatStats.handling + body.combatSkillsStartValues[name] + HOBBY_SKILL_BONUS,
            );
          } else {
            expect(combatStats.availablePoints).toBe(combatStats.handling + body.combatSkillsStartValues[name]);
          }

          // As we don't know the handling values from the API, we can't check the exact values
          expect(combatStats.handling).toBeGreaterThan(0);

          expect(combatStats.skilledAttackValue).toBe(0);
          expect(combatStats.skilledParadeValue).toBe(0);

          if (category === rangedCombatCategory) {
            const rangedAttackBaseValue =
              createdCharacter.characterSheet.baseValues.rangedAttackBaseValue.current +
              createdCharacter.characterSheet.baseValues.rangedAttackBaseValue.mod;
            expect(combatStats.attackValue).toBe(combatStats.skilledAttackValue + rangedAttackBaseValue);
            expect(combatStats.paradeValue).toBe(0);
          } else {
            const attackBaseValue =
              createdCharacter.characterSheet.baseValues.attackBaseValue.current +
              createdCharacter.characterSheet.baseValues.attackBaseValue.mod;
            expect(combatStats.attackValue).toBe(combatStats.skilledAttackValue + attackBaseValue);
            const paradeBaseValue =
              createdCharacter.characterSheet.baseValues.paradeBaseValue.current +
              createdCharacter.characterSheet.baseValues.paradeBaseValue.mod;
            expect(combatStats.paradeValue).toBe(combatStats.skilledParadeValue + paradeBaseValue);
          }
        });
      });

      // Check attribute points
      expect(createdCharacter.characterSheet.calculationPoints.attributePoints.start).toBe(
        ATTRIBUTE_POINTS_FOR_CREATION,
      );
      expect(createdCharacter.characterSheet.calculationPoints.attributePoints.available).toBe(0);
      expect(createdCharacter.characterSheet.calculationPoints.attributePoints.total).toBe(
        ATTRIBUTE_POINTS_FOR_CREATION,
      );

      expect(createdCharacter.characterSheet.calculationPoints.adventurePoints.start).toBe(0);
      expect(createdCharacter.characterSheet.calculationPoints.adventurePoints.available).toBe(0);
      expect(createdCharacter.characterSheet.calculationPoints.adventurePoints.total).toBe(0);

      // Check special abilities
      expect(createdCharacter.characterSheet.specialAbilities).toStrictEqual([]);

      // Check base values
      Object.entries(createdCharacter.characterSheet.baseValues).forEach(([, baseValue]) => {
        if (baseValue.byFormula === undefined) {
          // Base values without formulas should have byFormula undefined
          expect(baseValue.byFormula).toBeUndefined();
        } else {
          // Base values with formulas should have byFormula equal to current (since start = current = byFormula initially)
          expect(baseValue.byFormula).toBe(baseValue.current);
        }
        expect(baseValue.current).toBe(baseValue.start);
        // byLvlUp is managed by the level-up flow and should be undefined on creation
        expect(baseValue.byLvlUp).toBeUndefined();
      });

      // Check generation points
      const generationPointsThroughDisadvantages = body.disadvantages.reduce((sum, [, , value]) => sum + value, 0);
      const spentGenerationPoints = body.advantages.reduce((sum, [, , value]) => sum + value, 0);
      expect(response.data.changes.new.generationPoints.throughDisadvantages).toBe(
        generationPointsThroughDisadvantages,
      );
      expect(response.data.changes.new.generationPoints.spent).toBe(spentGenerationPoints);
      expect(response.data.changes.new.generationPoints.total).toBe(
        GENERATION_POINTS + generationPointsThroughDisadvantages,
      );

      // Check history record
      const historyRecord = response.historyRecord as PostCharactersHistoryRecord;
      expect(historyRecord).toBeDefined();
      expect(historyRecord.type).toBe(HistoryRecordType.CHARACTER_CREATED);
      expect(historyRecord.number).toBeGreaterThan(0);
      expect(historyRecord.id).toBeDefined();
      expect(historyRecord.timestamp).toBeDefined();
      expect(historyRecord.learningMethod).toBeNull();
      expect(historyRecord.comment).toBeNull();
      expect(historyRecord.calculationPoints.adventurePoints).toBeNull();
      expect(historyRecord.calculationPoints.attributePoints).toBeNull();
      expect(historyRecord.data.new).toStrictEqual(response.data.changes.new);
      expect(historyRecord.comment).toBeNull();
    });
  });
});
