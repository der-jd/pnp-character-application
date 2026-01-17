import { describe, it, expect, beforeEach } from "vitest";
import { CombatValueCollection } from "../../lib/domain/CombatValues";

describe("CombatValueCollection Domain Model", () => {
  let combatValueCollection: CombatValueCollection;
  let mockCombatValues: any;

  beforeEach(() => {
    mockCombatValues = {
      melee: {
        martialArts: {
          availablePoints: 15,
          handling: 8,
          attackValue: 12,
          skilledAttackValue: 6,
          paradeValue: 10,
          skilledParadeValue: 5,
        },
        barehanded: {
          availablePoints: 12,
          handling: 6,
          attackValue: 10,
          skilledAttackValue: 4,
          paradeValue: 8,
          skilledParadeValue: 3,
        },
        daggers: {
          availablePoints: 18,
          handling: 10,
          attackValue: 14,
          skilledAttackValue: 8,
          paradeValue: 12,
          skilledParadeValue: 7,
        },
        slashingWeaponsSharp1h: {
          availablePoints: 6,
          handling: 3,
          attackValue: 7,
          skilledAttackValue: 1,
          paradeValue: 5,
          skilledParadeValue: 0,
        },
        slashingWeaponsSharp2h: {
          availablePoints: 6,
          handling: 3,
          attackValue: 7,
          skilledAttackValue: 1,
          paradeValue: 5,
          skilledParadeValue: 0,
        },
      },
      ranged: {
        missile: {
          availablePoints: 14,
          handling: 7,
          attackValue: 11,
          skilledAttackValue: 5,
          paradeValue: 0,
          skilledParadeValue: 0,
        },
        firearmSimple: {
          availablePoints: 8,
          handling: 4,
          attackValue: 8,
          skilledAttackValue: 2,
          paradeValue: 0,
          skilledParadeValue: 0,
        },
        firearmMedium: {
          availablePoints: 6,
          handling: 3,
          attackValue: 7,
          skilledAttackValue: 1,
          paradeValue: 0,
          skilledParadeValue: 0,
        },
      },
    };

    combatValueCollection = new CombatValueCollection(mockCombatValues);
  });

  describe("Combat Value Retrieval", () => {
    it("should get a specific melee combat value by name", () => {
      const martialArts = combatValueCollection.getCombatValue("melee", "martialArts");

      expect(martialArts).toBeDefined();
      expect(martialArts?.name).toBe("martialArts");
      expect(martialArts?.type).toBe("melee");
      expect(martialArts?.availablePoints).toBe(15);
      expect(martialArts?.handling).toBe(8);
      expect(martialArts?.attackValue).toBe(12);
      expect(martialArts?.skilledAttackValue).toBe(6);
      expect(martialArts?.paradeValue).toBe(10);
      expect(martialArts?.skilledParadeValue).toBe(5);
    });

    it("should get a specific ranged combat value by name", () => {
      const missile = combatValueCollection.getCombatValue("ranged", "missile");

      expect(missile).toBeDefined();
      expect(missile?.name).toBe("missile");
      expect(missile?.type).toBe("ranged");
      expect(missile?.availablePoints).toBe(14);
      expect(missile?.handling).toBe(7);
      expect(missile?.attackValue).toBe(11);
      expect(missile?.skilledAttackValue).toBe(5);
      expect(missile?.paradeValue).toBe(0); // Ranged weapons don't have parade
      expect(missile?.skilledParadeValue).toBe(0);
    });

    it("should return null for non-existent combat values", () => {
      const nonExistent = combatValueCollection.getCombatValue("melee", "nonexistent");
      expect(nonExistent).toBeNull();
    });

    it("should return null for invalid categories", () => {
      const invalidCategory = combatValueCollection.getCombatValue("invalid" as any, "martialArts");
      expect(invalidCategory).toBeNull();
    });
  });

  describe("Melee Combat Values", () => {
    it("should get all melee combat values", () => {
      const meleeValues = combatValueCollection.getMeleeCombatValues();

      // Test behavior, not specific data
      expect(meleeValues.length).toBeGreaterThan(0);
      expect(meleeValues.every((cv) => cv.type === "melee")).toBe(true);
      expect(meleeValues.every((cv) => typeof cv.name === "string")).toBe(true);
      expect(meleeValues.every((cv) => typeof cv.displayName === "string")).toBe(true);
    });

    it("should have parade values for all melee combat values", () => {
      const meleeValues = combatValueCollection.getMeleeCombatValues();

      // Business rule: Melee weapons should have parade values
      meleeValues.forEach((combatValue) => {
        expect(combatValue.type).toBe("melee");
        expect(combatValue.paradeValue).toBeGreaterThan(0);
        expect(combatValue.skilledParadeValue).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Ranged Combat Values", () => {
    it("should get all ranged combat values", () => {
      const rangedValues = combatValueCollection.getRangedCombatValues();

      // Test behavior, not specific data
      expect(rangedValues.length).toBeGreaterThan(0);
      expect(rangedValues.every((cv) => cv.type === "ranged")).toBe(true);
      expect(rangedValues.every((cv) => typeof cv.name === "string")).toBe(true);
      expect(rangedValues.every((cv) => typeof cv.displayName === "string")).toBe(true);
    });

    it("should have no parade values for ranged combat values", () => {
      const rangedValues = combatValueCollection.getRangedCombatValues();

      // Business rule: Ranged weapons should not have parade values
      rangedValues.forEach((combatValue) => {
        expect(combatValue.type).toBe("ranged");
        expect(combatValue.paradeValue).toBe(0);
        expect(combatValue.skilledParadeValue).toBe(0);
      });
    });
  });

  describe("All Combat Values", () => {
    it("should get all combat values from both categories", () => {
      const allCombatValues = combatValueCollection.getAllCombatValues();
      const meleeCount = combatValueCollection.getMeleeCombatValues().length;
      const rangedCount = combatValueCollection.getRangedCombatValues().length;

      // Should combine both categories
      expect(allCombatValues.length).toBe(meleeCount + rangedCount);

      // Should contain both melee and ranged types
      const types = allCombatValues.map((cv) => cv.type);
      expect(types).toContain("melee");
      expect(types).toContain("ranged");

      // Check specific weapons
      const names = allCombatValues.map((cv) => cv.name);
      expect(names).toContain("martialArts");
      expect(names).toContain("daggers");
      expect(names).toContain("missile");
      expect(names).toContain("firearmSimple");
    });

    it("should create proper view models for all combat values", () => {
      const allCombatValues = combatValueCollection.getAllCombatValues();

      allCombatValues.forEach((combatValue) => {
        // Test view model structure
        expect(combatValue).toHaveProperty("name");
        expect(combatValue).toHaveProperty("type");
        expect(combatValue).toHaveProperty("displayName");
        expect(combatValue).toHaveProperty("availablePoints");
        expect(combatValue).toHaveProperty("handling");
        expect(combatValue).toHaveProperty("attackValue");
        expect(combatValue).toHaveProperty("skilledAttackValue");
        expect(combatValue).toHaveProperty("paradeValue");
        expect(combatValue).toHaveProperty("skilledParadeValue");

        // Type validation
        expect(typeof combatValue.name).toBe("string");
        expect(typeof combatValue.type).toBe("string");
        expect(typeof combatValue.displayName).toBe("string");
        expect(typeof combatValue.availablePoints).toBe("number");
        expect(typeof combatValue.handling).toBe("number");
        expect(typeof combatValue.attackValue).toBe("number");
        expect(typeof combatValue.skilledAttackValue).toBe("number");
        expect(typeof combatValue.paradeValue).toBe("number");
        expect(typeof combatValue.skilledParadeValue).toBe("number");
      });
    });
  });

  describe("Combat Value View Models", () => {
    it("should format combat value names correctly", () => {
      const slashingWeaponsSharp1h = combatValueCollection.getCombatValue("melee", "slashingWeaponsSharp1h");

      expect(slashingWeaponsSharp1h?.displayName).toBe("Slashing Weapons Sharp (1H)");
    });

    it("should calculate skilled values correctly", () => {
      const daggers = combatValueCollection.getCombatValue("melee", "daggers");

      if (daggers) {
        expect(daggers.skilledAttackValue).toBeLessThanOrEqual(daggers.attackValue);
        expect(daggers.skilledParadeValue).toBeLessThanOrEqual(daggers.paradeValue);
      }
    });

    it("should show appropriate handling values", () => {
      const allCombatValues = combatValueCollection.getAllCombatValues();

      allCombatValues.forEach((combatValue) => {
        expect(combatValue.handling).toBeGreaterThanOrEqual(0);
        expect(combatValue.availablePoints).toBeGreaterThanOrEqual(combatValue.handling);
      });
    });
  });

  describe("Best Combat Values", () => {
    it("should identify best melee combat values", () => {
      const bestMelee = combatValueCollection.getBestMeleeCombatValues(3);

      expect(bestMelee.length).toBeLessThanOrEqual(3);

      // Should be sorted by availablePoints (highest first)
      for (let i = 0; i < bestMelee.length - 1; i++) {
        expect(bestMelee[i].availablePoints).toBeGreaterThanOrEqual(bestMelee[i + 1].availablePoints);
      }

      // All should be melee
      bestMelee.forEach((combatValue) => {
        expect(combatValue.type).toBe("melee");
      });
    });

    it("should identify best ranged combat values", () => {
      const bestRanged = combatValueCollection.getBestRangedCombatValues(2);

      expect(bestRanged.length).toBeLessThanOrEqual(2);

      // Should be sorted by availablePoints (highest first)
      for (let i = 0; i < bestRanged.length - 1; i++) {
        expect(bestRanged[i].availablePoints).toBeGreaterThanOrEqual(bestRanged[i + 1].availablePoints);
      }

      // All should be ranged
      bestRanged.forEach((combatValue) => {
        expect(combatValue.type).toBe("ranged");
      });
    });
  });

  describe("Combat Value Categories", () => {
    it("should distinguish between weapon types correctly", () => {
      const martialArts = combatValueCollection.getCombatValue("melee", "martialArts");
      const daggers = combatValueCollection.getCombatValue("melee", "daggers");
      const missile = combatValueCollection.getCombatValue("ranged", "missile");

      expect(martialArts?.type).toBe("melee");
      expect(daggers?.type).toBe("melee");
      expect(missile?.type).toBe("ranged");

      // Melee should have parade, ranged should not
      expect(martialArts?.paradeValue).toBeGreaterThan(0);
      expect(daggers?.paradeValue).toBeGreaterThan(0);
      expect(missile?.paradeValue).toBe(0);
    });

    it("should handle one-handed vs two-handed weapons", () => {
      const oneHanded = combatValueCollection.getCombatValue("melee", "slashingWeaponsSharp1h");
      const twoHanded = combatValueCollection.getCombatValue("melee", "slashingWeaponsSharp2h");

      expect(oneHanded?.name).toContain("1h");
      expect(twoHanded?.name).toContain("2h");

      // Both should be melee and have parade values
      expect(oneHanded?.type).toBe("melee");
      expect(twoHanded?.type).toBe("melee");
      expect(oneHanded?.paradeValue).toBeGreaterThan(0);
      expect(twoHanded?.paradeValue).toBeGreaterThan(0);
    });
  });

  describe("Combat Value Statistics", () => {
    it("should calculate total available points correctly", () => {
      const allCombatValues = combatValueCollection.getAllCombatValues();
      const calculatedTotal = allCombatValues.reduce((sum, cv) => sum + cv.availablePoints, 0);
      const methodTotal = combatValueCollection.getTotalAvailablePoints();

      // Test calculation consistency
      expect(methodTotal).toBe(calculatedTotal);
      expect(methodTotal).toBeGreaterThan(0);
    });

    it("should have consistent attack and parade value relationships", () => {
      const meleeCombatValues = combatValueCollection.getMeleeCombatValues();

      meleeCombatValues.forEach((combatValue) => {
        // Attack value should be greater than or equal to skilled attack value
        expect(combatValue.attackValue).toBeGreaterThanOrEqual(combatValue.skilledAttackValue);
        // Parade value should be greater than or equal to skilled parade value
        expect(combatValue.paradeValue).toBeGreaterThanOrEqual(combatValue.skilledParadeValue);
      });
    });
  });
});
