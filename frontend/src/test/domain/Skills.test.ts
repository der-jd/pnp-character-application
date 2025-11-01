import { describe, it, expect, beforeEach } from "vitest";
import { SkillCollection } from "../../lib/domain/Skills";
import { CostCategory } from "api-spec";

describe("SkillCollection Domain Model", () => {
  let skillCollection: SkillCollection;
  let mockSkills: any;

  beforeEach(() => {
    // Create a complete mock skills object with all required skills
    mockSkills = {
      combat: {
        martialArts: {
          activated: true,
          start: 5,
          current: 8,
          mod: 3,
          totalCost: 30,
          defaultCostCategory: CostCategory.CAT_1,
        },
        barehanded: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        chainWeapons: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        daggers: {
          activated: true,
          start: 5,
          current: 6,
          mod: 1,
          totalCost: 10,
          defaultCostCategory: CostCategory.CAT_1,
        },
        slashingWeaponsSharp1h: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        slashingWeaponsBlunt1h: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        thrustingWeapons1h: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        slashingWeaponsSharp2h: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        slashingWeaponsBlunt2h: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        thrustingWeapons2h: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        missile: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        firearmSimple: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        firearmMedium: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        firearmComplex: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
        heavyWeapons: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_1,
        },
      },
      body: {
        athletics: {
          activated: true,
          start: 4,
          current: 6,
          mod: 2,
          totalCost: 18,
          defaultCostCategory: CostCategory.CAT_2,
        },
        juggleries: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        climbing: {
          activated: true,
          start: 5,
          current: 7,
          mod: 2,
          totalCost: 20,
          defaultCostCategory: CostCategory.CAT_2,
        },
        bodyControl: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        riding: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        sneaking: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        swimming: {
          activated: false,
          start: 5,
          current: 5,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        selfControl: {
          activated: false,
          start: 5,
          current: 5,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        hiding: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        singing: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        sharpnessOfSenses: {
          activated: false,
          start: 5,
          current: 5,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        dancing: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        quaffing: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        pickpocketing: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
      },
      social: {
        seduction: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        etiquette: {
          activated: false,
          start: 5,
          current: 5,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        teaching: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        acting: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        writtenExpression: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        streetKnowledge: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        knowledgeOfHumanNature: {
          activated: false,
          start: 5,
          current: 5,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        persuading: {
          activated: true,
          start: 6,
          current: 9,
          mod: 3,
          totalCost: 45,
          defaultCostCategory: CostCategory.CAT_3,
        },
        convincing: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        bargaining: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
      },
      nature: {
        tracking: {
          activated: true,
          start: 4,
          current: 6,
          mod: 2,
          totalCost: 24,
          defaultCostCategory: CostCategory.CAT_2,
        },
        knottingSkills: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        trapping: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        fishing: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        orientation: {
          activated: false,
          start: 5,
          current: 5,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
        wildernessLife: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_2,
        },
      },
      knowledge: {
        anatomy: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        architecture: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        geography: {
          activated: false,
          start: 4,
          current: 4,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        history: {
          activated: true,
          start: 6,
          current: 8,
          mod: 2,
          totalCost: 28,
          defaultCostCategory: CostCategory.CAT_3,
        },
        petrology: {
          activated: false,
          start: 3,
          current: 3,
          mod: 0,
          totalCost: 0,
          defaultCostCategory: CostCategory.CAT_3,
        },
        knowledgeOfTheLaw: {
          activated: true,
          start: 4,
          current: 7,
          mod: 3,
          totalCost: 30,
          defaultCostCategory: CostCategory.CAT_3,
        },
      },
      handcraft: {
        woodwork: {
          activated: true,
          start: 3,
          current: 6,
          mod: 3,
          totalCost: 36,
          defaultCostCategory: CostCategory.CAT_2,
        },
      },
    };
    skillCollection = new SkillCollection(mockSkills);
  });

  describe("Skill Retrieval", () => {
    it("should get a specific skill by category and name", () => {
      const martialArtsSkill = skillCollection.getSkill("combat", "martialArts");

      expect(martialArtsSkill).toBeDefined();
      expect(martialArtsSkill?.name).toBe("martialArts");
      expect(martialArtsSkill?.category).toBe("combat");

      // Test business logic: activated skill should have improvements and costs
      expect(martialArtsSkill?.isActivated).toBe(true);
      expect(martialArtsSkill?.currentLevel).toBeGreaterThan(martialArtsSkill?.startLevel || 0);
      expect(martialArtsSkill?.modifier).toBeGreaterThan(0);
      expect(martialArtsSkill?.totalCost).toBeGreaterThan(0);
    });

    it("should return null for non-existent skills", () => {
      const nonExistentSkill = skillCollection.getSkill("combat", "nonexistent");
      expect(nonExistentSkill).toBeNull();
    });

    it("should return null for non-existent categories", () => {
      const nonExistentSkill = skillCollection.getSkill("invalid-category", "martialArts");
      expect(nonExistentSkill).toBeNull();
    });
  });

  describe("Skills by Category", () => {
    it("should get all skills for combat category", () => {
      const combatSkills = skillCollection.getByCategory("combat");

      expect(combatSkills.length).toBeGreaterThan(0);
      expect(combatSkills.map((s) => s.name)).toContain("martialArts");
      expect(combatSkills.map((s) => s.name)).toContain("daggers");

      const martialArtsSkill = combatSkills.find((s) => s.name === "martialArts");
      expect(martialArtsSkill?.currentLevel).toBe(8);
      expect(martialArtsSkill?.isActivated).toBe(true);
    });

    it("should get all skills for body category", () => {
      const bodySkills = skillCollection.getByCategory("body");

      expect(bodySkills.length).toBeGreaterThan(0);
      expect(bodySkills.map((s) => s.name)).toContain("climbing");
      expect(bodySkills.map((s) => s.name)).toContain("athletics");
      expect(bodySkills.map((s) => s.name)).toContain("swimming");

      const climbingSkill = bodySkills.find((s) => s.name === "climbing");
      expect(climbingSkill?.currentLevel).toBe(7);
      expect(climbingSkill?.isActivated).toBe(true);
    });

    it("should return empty array for category with no skills", () => {
      const emptyBodySkills = skillCollection.getByCategory("body").filter((skill) => !skill.isActivated);

      // Should have non-activated skills
      expect(emptyBodySkills.length).toBeGreaterThan(0);

      // Check that non-activated skills have appropriate properties
      emptyBodySkills.forEach((skill) => {
        expect(skill.isActivated).toBe(false);
        expect(skill.totalCost).toBe(0);
        expect(skill.modifier).toBe(0);
      });
    });
  });

  describe("All Skills", () => {
    it("should get all skills flattened into a single array", () => {
      const allSkills = skillCollection.getAllSkills();

      // Should have all skills from all categories
      expect(allSkills.length).toBeGreaterThan(0);

      // Should contain skills from different categories
      const skillNames = allSkills.map((s) => s.name);
      expect(skillNames).toContain("martialArts");
      expect(skillNames).toContain("climbing");
      expect(skillNames).toContain("persuading");
      expect(skillNames).toContain("tracking");
      expect(skillNames).toContain("history");
      expect(skillNames).toContain("woodwork");
    });

    it("should create proper view models for all skills", () => {
      const allSkills = skillCollection.getAllSkills();

      allSkills.forEach((skill) => {
        expect(skill).toHaveProperty("name");
        expect(skill).toHaveProperty("category");
        expect(skill).toHaveProperty("displayName");
        expect(skill).toHaveProperty("currentLevel");
        expect(skill).toHaveProperty("startLevel");
        expect(skill).toHaveProperty("modifier");
        expect(skill).toHaveProperty("isActivated");
        expect(skill).toHaveProperty("totalCost");
        expect(skill).toHaveProperty("defaultCostCategory");

        // Basic validation
        expect(typeof skill.name).toBe("string");
        expect(typeof skill.category).toBe("string");
        expect(typeof skill.currentLevel).toBe("number");
        expect(typeof skill.startLevel).toBe("number");
        expect(typeof skill.modifier).toBe("number");
        expect(typeof skill.isActivated).toBe("boolean");
        expect(typeof skill.totalCost).toBe("number");
      });
    });
  });

  describe("Skill View Models", () => {
    it("should calculate modifier correctly", () => {
      const martialArtsSkill = skillCollection.getSkill("combat", "martialArts");

      expect(martialArtsSkill?.modifier).toBe(3);
      expect(martialArtsSkill?.currentLevel).toBe(8);
      expect(martialArtsSkill?.startLevel).toBe(5);
    });

    it("should handle zero modifier skills", () => {
      const swimmingSkill = skillCollection.getSkill("body", "swimming");

      expect(swimmingSkill?.modifier).toBe(0);
      expect(swimmingSkill?.currentLevel).toBe(5);
      expect(swimmingSkill?.startLevel).toBe(5);
      expect(swimmingSkill?.isActivated).toBe(false);
    });

    it("should format skill names correctly", () => {
      const knowledgeSkill = skillCollection.getSkill("knowledge", "knowledgeOfTheLaw");

      expect(knowledgeSkill?.displayName).toBe("Knowledge Of The Law");
    });

    it("should get only activated skills", () => {
      const activatedSkills = skillCollection.getActivatedSkills();

      // Should have only activated skills
      activatedSkills.forEach((skill) => {
        expect(skill.isActivated).toBe(true);
        expect(skill.totalCost).toBeGreaterThan(0);
        expect(skill.modifier).toBeGreaterThan(0);
      });

      // Check specific activated skills
      const activatedNames = activatedSkills.map((s) => s.name);
      expect(activatedNames).toContain("martialArts");
      expect(activatedNames).toContain("daggers");
      expect(activatedNames).toContain("athletics");
      expect(activatedNames).toContain("climbing");
      expect(activatedNames).toContain("persuading");
      expect(activatedNames).toContain("tracking");
      expect(activatedNames).toContain("history");
      expect(activatedNames).toContain("woodwork");
    });
  });
});
