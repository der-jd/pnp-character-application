import { describe, it, expect } from "vitest";
import { Character } from "../../lib/domain/Character";

describe("Character Domain Model", () => {
  // Use a minimal mock that focuses on testing the domain logic
  const mockApiCharacter = {
    userId: "user123",
    characterId: "char456",
    characterSheet: {
      generalInformation: {
        name: "Test Character",
        level: 3,
      },
      calculationPoints: {
        adventurePoints: { available: 50 },
        attributePoints: { available: 10 },
      },
      // Add minimal required properties as needed
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any; // Use any for now to focus on testing behavior

  describe("Character Creation", () => {
    it("should create character from API data", () => {
      const character = Character.fromApiData(mockApiCharacter);

      expect(character).toBeDefined();
      expect(character.characterId).toBe("char456");
      expect(character.userId).toBe("user123");
      expect(character.name).toBe("Test Character");
      expect(character.level).toBe(3);
    });
  });

  describe("Character Properties", () => {
    it("should return correct basic properties", () => {
      const character = Character.fromApiData(mockApiCharacter);

      expect(character.name).toBe("Test Character");
      expect(character.level).toBe(3);
      expect(character.adventurePoints).toBe(50);
      expect(character.attributePoints).toBe(10);
    });
  });

  describe("Domain Collections", () => {
    it("should initialize collections properly", () => {
      const character = Character.fromApiData(mockApiCharacter);

      expect(character.skills).toBeDefined();
      expect(character.attributes).toBeDefined();
      expect(character.combatValues).toBeDefined();
      expect(character.baseValues).toBeDefined();
    });

    it("should provide access to skill collection methods", () => {
      const character = Character.fromApiData(mockApiCharacter);

      // Test that the collections have the expected methods
      expect(typeof character.skills.getAllSkills).toBe("function");
      expect(typeof character.skills.getByCategory).toBe("function");
      expect(typeof character.skills.getSkill).toBe("function");
    });

    it("should provide access to attribute collection methods", () => {
      const character = Character.fromApiData(mockApiCharacter);

      expect(typeof character.attributes.getAllAttributes).toBe("function");
      expect(typeof character.attributes.getAttribute).toBe("function");
    });

    it("should provide access to combat value collection methods", () => {
      const character = Character.fromApiData(mockApiCharacter);

      expect(typeof character.combatValues.getAllCombatValues).toBe("function");
      expect(typeof character.combatValues.getCombatValue).toBe("function");
    });

    it("should provide access to base value collection methods", () => {
      const character = Character.fromApiData(mockApiCharacter);

      expect(typeof character.baseValues.getAllBaseValues).toBe("function");
      expect(typeof character.baseValues.getBaseValue).toBe("function");
    });
  });

  describe("Mutations and API shapes", () => {
    it("should return API-shaped data from toApiData", () => {
      const character = Character.fromApiData(mockApiCharacter);
      const apiData = character.toApiData();

      expect(apiData).toHaveProperty("userId", "user123");
      expect(apiData).toHaveProperty("characterId", "char456");
      expect(apiData).toHaveProperty("characterSheet");
    });

    it("should update character sheet via updateCharacterSheet and reflect in getters", () => {
      const character = Character.fromApiData(mockApiCharacter);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newSheet = {
        ...mockApiCharacter.characterSheet,
        generalInformation: { name: "Updated Name", level: 5 },
        calculationPoints: { adventurePoints: { available: 5 }, attributePoints: { available: 2 } },
      } as any;

      character.updateCharacterSheet(newSheet);

      expect(character.name).toBe("Updated Name");
      expect(character.level).toBe(5);
      expect(character.adventurePoints).toBe(5);
      expect(character.attributePoints).toBe(2);
    });

    it("should produce a compact summary via toSummary", () => {
      const character = Character.fromApiData(mockApiCharacter);
      const summary = character.toSummary();

      expect(summary).toEqual({ characterId: "char456", name: "Test Character", level: 3, userId: "user123" });
    });
  });
});
