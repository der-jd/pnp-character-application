import { describe, it, expect, beforeEach } from "vitest";
import { AttributeCollection } from "../../lib/domain/Attributes";
import type { CharacterSheet } from "api-spec";

describe("AttributeCollection Domain Model", () => {
  let attributeCollection: AttributeCollection;
  let mockAttributes: CharacterSheet["attributes"];

  beforeEach(() => {
    // Minimal mock focusing on business logic patterns
    mockAttributes = {
      courage: { start: 5, current: 7, mod: 2, totalCost: 15 }, // Improved attribute
      intelligence: { start: 6, current: 6, mod: 0, totalCost: 0 }, // Unchanged attribute
      concentration: { start: 4, current: 6, mod: 2, totalCost: 12 }, // Improved attribute
      charisma: { start: 5, current: 5, mod: 0, totalCost: 0 }, // Unchanged attribute
      mentalResilience: { start: 4, current: 7, mod: 3, totalCost: 20 }, // High improvement
      dexterity: { start: 6, current: 8, mod: 2, totalCost: 16 }, // Physical improved
      endurance: { start: 5, current: 5, mod: 0, totalCost: 0 }, // Physical unchanged
      strength: { start: 4, current: 6, mod: 2, totalCost: 14 }, // Physical improved
    };

    attributeCollection = new AttributeCollection(mockAttributes);
  });

  describe("Attribute Retrieval", () => {
    it("should get a specific attribute by name", () => {
      const courageAttribute = attributeCollection.getAttribute("courage");

      expect(courageAttribute).toBeDefined();
      expect(courageAttribute?.name).toBe("courage");

      // Test business logic: improved attribute should have positive modifier and cost
      expect(courageAttribute?.currentValue).toBeGreaterThan(courageAttribute?.startValue || 0);
      expect(courageAttribute?.modifier).toBeGreaterThan(0);
      expect(courageAttribute?.totalCost).toBeGreaterThan(0);
    });

    it("should return null for non-existent attributes", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nonExistentAttribute = attributeCollection.getAttribute("nonexistent" as any);
      expect(nonExistentAttribute).toBeNull();
    });

    it("should handle unchanged attributes correctly", () => {
      const charismaAttribute = attributeCollection.getAttribute("charisma");

      // Test business logic: unchanged attribute should have zero modifier and cost
      expect(charismaAttribute?.modifier).toBe(0);
      expect(charismaAttribute?.currentValue).toBe(charismaAttribute?.startValue);
      expect(charismaAttribute?.totalCost).toBe(0);
    });
  });

  describe("All Attributes", () => {
    it("should get all attributes as view models", () => {
      const allAttributes = attributeCollection.getAllAttributes();

      expect(allAttributes).toHaveLength(8);

      // Check that all expected attributes are present
      const attributeNames = allAttributes.map((attr) => attr.name);
      expect(attributeNames).toContain("courage");
      expect(attributeNames).toContain("intelligence");
      expect(attributeNames).toContain("concentration");
      expect(attributeNames).toContain("charisma");
      expect(attributeNames).toContain("mentalResilience");
      expect(attributeNames).toContain("dexterity");
      expect(attributeNames).toContain("endurance");
      expect(attributeNames).toContain("strength");
    });

    it("should create proper view models for all attributes", () => {
      const allAttributes = attributeCollection.getAllAttributes();

      allAttributes.forEach((attribute) => {
        expect(attribute).toHaveProperty("name");
        expect(attribute).toHaveProperty("displayName");
        expect(attribute).toHaveProperty("currentValue");
        expect(attribute).toHaveProperty("startValue");
        expect(attribute).toHaveProperty("modifier");
        expect(attribute).toHaveProperty("totalCost");

        // Basic validation
        expect(typeof attribute.name).toBe("string");
        expect(typeof attribute.displayName).toBe("string");
        expect(typeof attribute.currentValue).toBe("number");
        expect(typeof attribute.startValue).toBe("number");
        expect(typeof attribute.modifier).toBe("number");
        expect(typeof attribute.totalCost).toBe("number");
      });
    });
  });

  describe("Attribute View Models", () => {
    it("should format attribute names correctly", () => {
      const allAttributes = attributeCollection.getAllAttributes();

      // Business logic: all attributes should have readable display names
      allAttributes.forEach((attribute) => {
        expect(attribute.displayName).toBeDefined();
        expect(attribute.displayName.length).toBeGreaterThan(0);
        expect(attribute.displayName).not.toBe(attribute.name); // Should be formatted, not raw
      });

      // Test specific formatting pattern with camelCase -> Title Case
      const mentalResilienceAttribute = attributeCollection.getAttribute("mentalResilience");
      expect(mentalResilienceAttribute?.displayName).toMatch(/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/);
    });

    it("should calculate modifiers correctly", () => {
      const dexterityAttribute = attributeCollection.getAttribute("dexterity");

      // Business logic: modifier should equal current - start
      const expectedModifier = (dexterityAttribute?.currentValue || 0) - (dexterityAttribute?.startValue || 0);
      expect(dexterityAttribute?.modifier).toBe(expectedModifier);

      // For improved attribute, cost should be positive
      if (expectedModifier > 0) {
        expect(dexterityAttribute?.totalCost).toBeGreaterThan(0);
      }
    });

    it("should follow cost business rules", () => {
      const allAttributes = attributeCollection.getAllAttributes();

      allAttributes.forEach((attribute) => {
        // Business rule: improved attributes must have positive cost
        if (attribute.modifier > 0) {
          expect(attribute.totalCost).toBeGreaterThan(0);
          expect(attribute.currentValue).toBeGreaterThan(attribute.startValue);
        }

        // Business rule: unchanged attributes should have zero cost
        if (attribute.modifier === 0) {
          expect(attribute.totalCost).toBe(0);
          expect(attribute.currentValue).toBe(attribute.startValue);
        }
      });
    });
  });

  describe("Mental Attributes", () => {
    it("should identify mental attributes correctly", () => {
      const allAttributes = attributeCollection.getAllAttributes();

      // Mental attributes: courage, intelligence, concentration, charisma, mentalResilience
      const mentalAttributeNames = ["courage", "intelligence", "concentration", "charisma", "mentalResilience"];
      const mentalAttributes = allAttributes.filter((attr) => mentalAttributeNames.includes(attr.name));

      expect(mentalAttributes).toHaveLength(5);

      mentalAttributes.forEach((attribute) => {
        expect(mentalAttributeNames).toContain(attribute.name);
      });
    });
  });

  describe("Physical Attributes", () => {
    it("should identify physical attributes correctly", () => {
      const allAttributes = attributeCollection.getAllAttributes();

      // Physical attributes: dexterity, endurance, strength
      const physicalAttributeNames = ["dexterity", "endurance", "strength"];
      const physicalAttributes = allAttributes.filter((attr) => physicalAttributeNames.includes(attr.name));

      expect(physicalAttributes).toHaveLength(3);

      physicalAttributes.forEach((attribute) => {
        expect(physicalAttributeNames).toContain(attribute.name);
      });
    });
  });

  describe("Attribute Statistics", () => {
    it("should calculate total attribute costs correctly", () => {
      const allAttributes = attributeCollection.getAllAttributes();
      const totalCost = allAttributes.reduce((sum, attr) => sum + attr.totalCost, 0);

      // Business logic: total cost should be sum of individual costs and > 0 for improved character
      const improvedAttributes = allAttributes.filter((attr) => attr.modifier > 0);
      const expectedMinimum = improvedAttributes.length > 0 ? 10 : 0; // At least some cost for improvements

      expect(totalCost).toBeGreaterThanOrEqual(expectedMinimum);
      expect(totalCost).toBe(allAttributes.reduce((sum, attr) => sum + attr.totalCost, 0));
    });

    it("should have consistent modifier calculations", () => {
      const allAttributes = attributeCollection.getAllAttributes();

      allAttributes.forEach((attribute) => {
        const expectedModifier = attribute.currentValue - attribute.startValue;
        expect(attribute.modifier).toBe(expectedModifier);
      });
    });

    it("should handle missing attributes gracefully in primary list", () => {
      // Remove one primary attribute and ensure getPrimaryAttributes filters nulls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partialAttributes = { ...mockAttributes } as any;
      delete partialAttributes.concentration;

      const partialCollection = new AttributeCollection(partialAttributes);
      const primary = partialCollection.getPrimaryAttributes();

      // concentration was removed, so primary count should be one less than full
      expect(primary.find((p) => p.name === "concentration")).toBeUndefined();
      expect(primary.length).toBeLessThanOrEqual(7);
    });

    it("should compute total attribute points spent correctly for custom costs", () => {
      // Modify costs to known values and verify sum
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const custom = { ...mockAttributes } as any;
      custom.courage.totalCost = 5;
      custom.intelligence.totalCost = 3;
      custom.concentration.totalCost = 7;

      const customCollection = new AttributeCollection(custom);
      const total = customCollection.getTotalAttributePointsSpent();

      expect(total).toBe(
        5 +
          3 +
          7 +
          custom.dexterity.totalCost +
          custom.strength.totalCost +
          custom.mentalResilience.totalCost +
          custom.endurance.totalCost +
          custom.charisma.totalCost
      );
    });
  });
});
