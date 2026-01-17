import { describe, it, expect, beforeEach } from "vitest";
import { BaseValueCollection } from "../../lib/domain/BaseValues";

describe("BaseValueCollection Domain Model", () => {
  let baseValueCollection: BaseValueCollection;
  let mockBaseValues: any;

  beforeEach(() => {
    // Minimal mock focusing on different calculation patterns
    mockBaseValues = {
      healthPoints: { start: 20, current: 26, byFormula: 20, byLvlUp: 6, mod: 0 }, // Formula + LevelUp
      mentalHealth: { start: 15, current: 18, byFormula: 15, byLvlUp: 3, mod: 0 }, // Formula + LevelUp
      armorLevel: { start: 0, current: 3, byFormula: 0, byLvlUp: 0, mod: 3 }, // Pure modifier
      naturalArmor: { start: 1, current: 1, byFormula: 1, byLvlUp: 0, mod: 0 }, // Unchanged
      initiativeBaseValue: { start: 10, current: 12, byFormula: 10, byLvlUp: 0, mod: 2 }, // Formula + modifier
      attackBaseValue: { start: 8, current: 10, byFormula: 8, byLvlUp: 0, mod: 2 }, // Combat value
      paradeBaseValue: { start: 8, current: 9, byFormula: 8, byLvlUp: 0, mod: 1 }, // Combat value
      rangedAttackBaseValue: { start: 7, current: 9, byFormula: 7, byLvlUp: 0, mod: 2 }, // Ranged combat
      luckPoints: { start: 2, current: 5, byFormula: 2, byLvlUp: 3, mod: 0 }, // Formula + LevelUp
      bonusActionsPerCombatRound: { start: 1, current: 1, byFormula: 1, byLvlUp: 0, mod: 0 }, // Unchanged
      legendaryActions: { start: 0, current: 0, byFormula: 0, byLvlUp: 0, mod: 0 }, // Unchanged (zero)
    };

    baseValueCollection = new BaseValueCollection(mockBaseValues);
  });

  describe("Base Value Retrieval", () => {
    it("should get a specific base value by name", () => {
      const healthPoints = baseValueCollection.getBaseValue("healthPoints");

      expect(healthPoints).toBeDefined();
      expect(healthPoints?.name).toBe("healthPoints");

      // Test business logic: health points should be improved by level-up
      expect(healthPoints?.currentValue).toBeGreaterThan(healthPoints?.startValue || 0);
      expect(healthPoints?.byLvlUp).toBeGreaterThan(0);
      expect(healthPoints?.byFormula).toBe(healthPoints?.startValue);
    });

    it("should return null for non-existent base values", () => {
      const nonExistentBaseValue = baseValueCollection.getBaseValue("nonexistent");
      expect(nonExistentBaseValue).toBeNull();
    });

    it("should handle base value with modifier", () => {
      const armorLevel = baseValueCollection.getBaseValue("armorLevel");

      // Test business logic: armor improved by modifier only
      expect(armorLevel?.modifier).toBeGreaterThan(0);
      expect(armorLevel?.currentValue).toBeGreaterThan(armorLevel?.startValue || 0);
      expect(armorLevel?.byLvlUp).toBe(0); // Armor not improved by level
      expect(armorLevel?.byFormula).toBe(armorLevel?.startValue);
    });
  });

  describe("All Base Values", () => {
    it("should get all base values as view models", () => {
      const allBaseValues = baseValueCollection.getAllBaseValues();

      expect(allBaseValues).toHaveLength(11);

      // Check that all expected base values are present
      const baseValueNames = allBaseValues.map((bv) => bv.name);
      expect(baseValueNames).toContain("healthPoints");
      expect(baseValueNames).toContain("mentalHealth");
      expect(baseValueNames).toContain("armorLevel");
      expect(baseValueNames).toContain("naturalArmor");
      expect(baseValueNames).toContain("initiativeBaseValue");
      expect(baseValueNames).toContain("attackBaseValue");
      expect(baseValueNames).toContain("paradeBaseValue");
      expect(baseValueNames).toContain("rangedAttackBaseValue");
      expect(baseValueNames).toContain("luckPoints");
      expect(baseValueNames).toContain("bonusActionsPerCombatRound");
      expect(baseValueNames).toContain("legendaryActions");
    });

    it("should create proper view models for all base values", () => {
      const allBaseValues = baseValueCollection.getAllBaseValues();

      allBaseValues.forEach((baseValue) => {
        expect(baseValue).toHaveProperty("name");
        expect(baseValue).toHaveProperty("displayName");
        expect(baseValue).toHaveProperty("currentValue");
        expect(baseValue).toHaveProperty("startValue");
        expect(baseValue).toHaveProperty("modifier");

        // Basic validation
        expect(typeof baseValue.name).toBe("string");
        expect(typeof baseValue.displayName).toBe("string");
        expect(typeof baseValue.currentValue).toBe("number");
        expect(typeof baseValue.startValue).toBe("number");
        expect(typeof baseValue.modifier).toBe("number");
      });
    });
  });

  describe("Base Value View Models", () => {
    it("should format base value names correctly", () => {
      const allBaseValues = baseValueCollection.getAllBaseValues();

      // Test business logic: all base values should have formatted display names
      allBaseValues.forEach((baseValue) => {
        expect(baseValue.displayName).toBeDefined();
        expect(baseValue.displayName.length).toBeGreaterThan(0);
        expect(baseValue.displayName).not.toBe(baseValue.name); // Should be formatted, not raw
        expect(baseValue.displayName[0]).toBe(baseValue.displayName[0].toUpperCase()); // Should start with capital
      });

      // Test specific formatting pattern with camelCase -> Title Case
      const rangedAttackBaseValue = baseValueCollection.getBaseValue("rangedAttackBaseValue");
      expect(rangedAttackBaseValue?.displayName).toMatch(/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/);
    });

    it("should handle formula-based calculations", () => {
      const healthPoints = baseValueCollection.getBaseValue("healthPoints");

      // Test business logic: health points use formula + level-up pattern
      expect(healthPoints?.byFormula).toBe(healthPoints?.startValue);
      expect(healthPoints?.byLvlUp).toBeGreaterThan(0);
      expect(healthPoints?.currentValue).toBe(
        (healthPoints?.byFormula || 0) + (healthPoints?.byLvlUp || 0) + (healthPoints?.modifier || 0)
      );
    });

    it("should handle modifier-based values", () => {
      const initiativeBaseValue = baseValueCollection.getBaseValue("initiativeBaseValue");

      // Test business logic: initiative improved by modifiers
      expect(initiativeBaseValue?.modifier).toBeGreaterThan(0);
      expect(initiativeBaseValue?.currentValue).toBeGreaterThan(initiativeBaseValue?.startValue || 0);
      expect(initiativeBaseValue?.currentValue).toBe(
        (initiativeBaseValue?.byFormula || 0) +
          (initiativeBaseValue?.byLvlUp || 0) +
          (initiativeBaseValue?.modifier || 0)
      );
    });
  });

  describe("Essential Base Values", () => {
    it("should get essential base values correctly", () => {
      const essentialBaseValues = baseValueCollection.getEssentialBaseValues();

      expect(essentialBaseValues.length).toBeGreaterThan(0);

      const essentialNames = essentialBaseValues.map((bv) => bv.name);
      expect(essentialNames).toContain("healthPoints");
      expect(essentialNames).toContain("mentalHealth");
      expect(essentialNames).toContain("luckPoints");
      expect(essentialNames).toContain("initiativeBaseValue");
    });
  });

  describe("Combat Base Values", () => {
    it("should identify combat-related base values correctly", () => {
      const combatBaseValueNames = [
        "initiativeBaseValue",
        "attackBaseValue",
        "paradeBaseValue",
        "rangedAttackBaseValue",
      ];

      // Test business logic: combat values should be identifiable and have valid calculations
      combatBaseValueNames.forEach((name) => {
        const baseValue = baseValueCollection.getBaseValue(name);
        expect(baseValue).toBeDefined();
        expect(baseValue!.name).toBe(name);

        // Combat values should follow calculation pattern
        const expectedCurrent = (baseValue!.byFormula || 0) + (baseValue!.byLvlUp || 0) + (baseValue!.modifier || 0);
        expect(baseValue!.currentValue).toBe(expectedCurrent);
      });
    });
  });

  describe("Health and Defensive Values", () => {
    it("should handle health values correctly", () => {
      const healthPoints = baseValueCollection.getBaseValue("healthPoints");
      const mentalHealth = baseValueCollection.getBaseValue("mentalHealth");

      // Test business logic: health values should use formula + level-up pattern
      [healthPoints, mentalHealth].forEach((healthValue) => {
        expect(healthValue!.currentValue).toBeGreaterThan(healthValue!.startValue);
        expect(healthValue!.byLvlUp).toBeGreaterThan(0); // Health improves with level
        expect(healthValue!.byFormula).toBe(healthValue!.startValue); // Formula equals start

        // Validate calculation consistency
        const expectedCurrent =
          (healthValue!.byFormula || 0) + (healthValue!.byLvlUp || 0) + (healthValue!.modifier || 0);
        expect(healthValue!.currentValue).toBe(expectedCurrent);
      });
    });

    it("should handle armor values correctly", () => {
      const armorLevel = baseValueCollection.getBaseValue("armorLevel");
      const naturalArmor = baseValueCollection.getBaseValue("naturalArmor");

      // Test business logic: armor level can be modified, natural armor typically isn't
      expect(armorLevel!.modifier).toBeGreaterThan(0); // Equipment-based armor
      expect(naturalArmor!.modifier).toBe(0); // Innate armor

      // Both should follow calculation pattern
      [armorLevel, naturalArmor].forEach((armorValue) => {
        const expectedCurrent = (armorValue!.byFormula || 0) + (armorValue!.byLvlUp || 0) + (armorValue!.modifier || 0);
        expect(armorValue!.currentValue).toBe(expectedCurrent);
      });
    });
  });

  describe("Base Value Consistency", () => {
    it("should have consistent current value calculations", () => {
      const allBaseValues = baseValueCollection.getAllBaseValues();

      allBaseValues.forEach((baseValue) => {
        const byFormula = baseValue.byFormula ?? baseValue.startValue;
        const byLvlUp = baseValue.byLvlUp ?? 0;
        const modifier = baseValue.modifier ?? 0;

        const expectedCurrent = byFormula + byLvlUp + modifier;
        expect(baseValue.currentValue).toBe(expectedCurrent);
      });
    });

    it("should format display names consistently", () => {
      const allBaseValues = baseValueCollection.getAllBaseValues();

      allBaseValues.forEach((baseValue) => {
        expect(baseValue.displayName).toBeTruthy();
        expect(baseValue.displayName.length).toBeGreaterThan(0);
        // Display name should be formatted (first letter capitalized, camelCase converted)
        expect(baseValue.displayName[0]).toBe(baseValue.displayName[0].toUpperCase());
      });
    });
  });
});
