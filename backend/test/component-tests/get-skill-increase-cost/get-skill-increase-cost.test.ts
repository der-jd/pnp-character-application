import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getSkillResponseSchema, type LearningMethodString } from "api-spec";
import { expectApiError, commonInvalidTestCases } from "../shared.js";
import { ApiClient } from "../api-client.js";
import { TestContext, TestContextFactory } from "../test-context-factory.js";

describe.sequential("get-skill-increase-cost component tests", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await TestContextFactory.createContext();
  });

  afterAll(async () => {
    await TestContextFactory.cleanupContext(context);
  });

  /**
   * =============================
   * Invalid requests
   * =============================
   */

  describe("Invalid requests", () => {
    commonInvalidTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;

        const authorizationHeader = _case.authorizationHeader ?? context.authorizationHeader;
        const path = _case.characterId
          ? `characters/${_case.characterId}/skills/social/knowledgeOfHumanNature`
          : `characters/${character.characterId}/skills/social/knowledgeOfHumanNature`;
        const client = new ApiClient(context.apiBaseUrl, authorizationHeader);

        await expectApiError(
          () => client.get(path, { "learning-method": "NORMAL" }),
          _case.expectedStatusCode,
          _case.expectedErrorMessage,
        );
      });
    });

    test("learning method query is missing", async () => {
      const character = context.character;

      await expectApiError(
        () => context.apiClient.get(`characters/${character.characterId}/skills/social/knowledgeOfHumanNature`),
        400,
        "Invalid input values",
      );
    });

    test("learning method query is invalid", async () => {
      const character = context.character;

      await expectApiError(
        () =>
          context.apiClient.get(`characters/${character.characterId}/skills/social/knowledgeOfHumanNature`, {
            "learning-method": "INVALID_METHOD",
          }),
        400,
        "Invalid input values",
      );
    });
  });

  /**
   * =============================
   * Valid requests - Social skills (default cost category '2')
   * =============================
   */

  describe("Valid requests - Social skills (default cost category '2')", () => {
    const socialSkillTestCases = [
      {
        name: "Get skill increase cost for knowledgeOfHumanNature at 49 (1 below 1st threshold)",
        skillCategory: "social",
        skillName: "knowledgeOfHumanNature",
        defaultCostCategory: 2,
        expectedResults: [
          {
            learningMethod: "FREE",
            increaseCost: 0,
          },
          {
            learningMethod: "LOW_PRICED",
            increaseCost: 0.5,
          },
          {
            learningMethod: "NORMAL",
            increaseCost: 1,
          },
          {
            learningMethod: "EXPENSIVE",
            increaseCost: 2,
          },
        ],
      },
      {
        name: "Get skill increase cost for bargaining at 50 (1st threshold)",
        skillCategory: "social",
        skillName: "bargaining",
        defaultCostCategory: 2,
        expectedResults: [
          {
            learningMethod: "FREE",
            increaseCost: 0,
          },
          {
            learningMethod: "LOW_PRICED",
            increaseCost: 1,
          },
          {
            learningMethod: "NORMAL",
            increaseCost: 2,
          },
          {
            learningMethod: "EXPENSIVE",
            increaseCost: 3,
          },
        ],
      },
      {
        name: "Get skill increase cost for etiquette at 74 (1 below 2nd threshold)",
        skillCategory: "social",
        skillName: "etiquette",
        defaultCostCategory: 2,
        expectedResults: [
          {
            learningMethod: "FREE",
            increaseCost: 0,
          },
          {
            learningMethod: "LOW_PRICED",
            increaseCost: 1,
          },
          {
            learningMethod: "NORMAL",
            increaseCost: 2,
          },
          {
            learningMethod: "EXPENSIVE",
            increaseCost: 3,
          },
        ],
      },
      {
        name: "Get skill increase cost for persuading at 75 (2nd threshold)",
        skillCategory: "social",
        skillName: "persuading",
        defaultCostCategory: 2,
        expectedResults: [
          {
            learningMethod: "FREE",
            increaseCost: 0,
          },
          {
            learningMethod: "LOW_PRICED",
            increaseCost: 2,
          },
          {
            learningMethod: "NORMAL",
            increaseCost: 3,
          },
          {
            learningMethod: "EXPENSIVE",
            increaseCost: 4,
          },
        ],
      },
    ];

    socialSkillTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;

        for (const expectedResult of _case.expectedResults) {
          const response = getSkillResponseSchema.parse(
            await context.apiClient.get(
              `characters/${character.characterId}/skills/${_case.skillCategory}/${_case.skillName}`,
              {
                "learning-method": expectedResult.learningMethod,
              },
            ),
          );

          // Verify response structure
          expect(response.characterId).toBe(character.characterId);
          expect(response.skillName).toBe(_case.skillName);
          expect(response.increaseCost).toBeCloseTo(expectedResult.increaseCost);
        }
      });
    });
  });

  /**
   * =============================
   * Valid requests - Combat skills (default cost category '3')
   * =============================
   */

  describe("Valid requests - Combat skills (default cost category '3')", () => {
    const combatSkillTestCases = [
      {
        name: "Get skill increase cost for thrustingWeapons2h at 49 (1 below 1st threshold)",
        skillCategory: "combat",
        skillName: "thrustingWeapons2h",
        defaultCostCategory: 3,
        expectedResults: [
          {
            learningMethod: "FREE",
            increaseCost: 0,
          },
          {
            learningMethod: "LOW_PRICED",
            increaseCost: 1,
          },
          {
            learningMethod: "NORMAL",
            increaseCost: 2,
          },
          {
            learningMethod: "EXPENSIVE",
            increaseCost: 3,
          },
        ],
      },
      {
        name: "Get skill increase cost for barehanded at 50 (1st threshold)",
        skillCategory: "combat",
        skillName: "barehanded",
        defaultCostCategory: 3,
        expectedResults: [
          {
            learningMethod: "FREE",
            increaseCost: 0,
          },
          {
            learningMethod: "LOW_PRICED",
            increaseCost: 2,
          },
          {
            learningMethod: "NORMAL",
            increaseCost: 3,
          },
          {
            learningMethod: "EXPENSIVE",
            increaseCost: 4,
          },
        ],
      },
      {
        name: "Get skill increase cost for daggers at 74 (1 below 2nd threshold)",
        skillCategory: "combat",
        skillName: "daggers",
        defaultCostCategory: 3,
        expectedResults: [
          {
            learningMethod: "FREE",
            increaseCost: 0,
          },
          {
            learningMethod: "LOW_PRICED",
            increaseCost: 2,
          },
          {
            learningMethod: "NORMAL",
            increaseCost: 3,
          },
          {
            learningMethod: "EXPENSIVE",
            increaseCost: 4,
          },
        ],
      },
      {
        name: "Get skill increase cost for slashingWeaponsBlunt1h at 75 (2nd threshold)",
        skillCategory: "combat",
        skillName: "slashingWeaponsBlunt1h",
        defaultCostCategory: 3,
        expectedResults: [
          {
            learningMethod: "FREE",
            increaseCost: 0,
          },
          {
            learningMethod: "LOW_PRICED",
            increaseCost: 3,
          },
          {
            learningMethod: "NORMAL",
            increaseCost: 4,
          },
          {
            learningMethod: "EXPENSIVE",
            increaseCost: 5,
          },
        ],
      },
    ];

    combatSkillTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;

        for (const expectedResult of _case.expectedResults) {
          const response = getSkillResponseSchema.parse(
            await context.apiClient.get(
              `characters/${character.characterId}/skills/${_case.skillCategory}/${_case.skillName}`,
              {
                "learning-method": expectedResult.learningMethod,
              },
            ),
          );

          // Verify response structure
          expect(response.characterId).toBe(character.characterId);
          expect(response.skillName).toBe(_case.skillName);
          expect(response.increaseCost).toBeCloseTo(expectedResult.increaseCost);
        }
      });
    });
  });

  /**
   * =============================
   * Valid requests - Body skills (default cost category '2')
   * =============================
   */

  describe("Valid requests - Body skills (default cost category '2')", () => {
    const bodySkillTestCases = [
      {
        name: "Get skill increase cost for athletics at 12 (below 2nd threshold)",
        skillCategory: "body",
        skillName: "athletics",
        defaultCostCategory: 2,
        expectedResults: [
          {
            learningMethod: "FREE",
            increaseCost: 0,
          },
          {
            learningMethod: "LOW_PRICED",
            increaseCost: 0.5,
          },
          {
            learningMethod: "NORMAL",
            increaseCost: 1,
          },
          {
            learningMethod: "EXPENSIVE",
            increaseCost: 2,
          },
        ],
      },
    ];

    bodySkillTestCases.forEach((_case) => {
      test(_case.name, async () => {
        const character = context.character;

        for (const expectedResult of _case.expectedResults) {
          const response = getSkillResponseSchema.parse(
            await context.apiClient.get(
              `characters/${character.characterId}/skills/${_case.skillCategory}/${_case.skillName}`,
              {
                "learning-method": expectedResult.learningMethod,
              },
            ),
          );

          // Verify response structure
          expect(response.characterId).toBe(character.characterId);
          expect(response.skillName).toBe(_case.skillName);
          expect(response.increaseCost).toBeCloseTo(expectedResult.increaseCost);
        }
      });
    });
  });

  /**
   * =============================
   * Cost progression verification
   * =============================
   */

  describe("Cost progression verification", () => {
    test("learning method costs are in ascending order", async () => {
      const character = context.character;
      const skillCategory = "social";
      const skillName = "knowledgeOfHumanNature";
      const methods: LearningMethodString[] = ["FREE", "LOW_PRICED", "NORMAL", "EXPENSIVE"];
      const costs = new Map<LearningMethodString, number>();

      for (const method of methods) {
        const response = getSkillResponseSchema.parse(
          await context.apiClient.get(`characters/${character.characterId}/skills/${skillCategory}/${skillName}`, {
            "learning-method": method,
          }),
        );

        expect(response.characterId).toBe(character.characterId);
        expect(response.skillName).toBe(skillName);
        costs.set(method, response.increaseCost);
      }

      expect(costs.get("FREE")!).toBe(0);
      expect(costs.get("FREE")!).toBeLessThan(costs.get("LOW_PRICED")!);
      expect(costs.get("LOW_PRICED")!).toBeLessThan(costs.get("NORMAL")!);
      expect(costs.get("NORMAL")!).toBeLessThan(costs.get("EXPENSIVE")!);
    });
  });
});
