import { describe, it, expect } from "vitest";
import de from "@/i18n/de";
import {
  attributeKeys,
  baseValueKeys,
  skillCategoryKeys,
  skillNameKeys,
  advantageNameKeys,
  disadvantageNameKeys,
  historyRecordTypeKeys,
  levelUpEffectKeys,
  learningMethodKeys,
} from "@/i18n/mappings";
import { AdvantagesNames, DisadvantagesNames, HistoryRecordType, skillCategories } from "api-spec";

describe("i18n mappings", () => {
  const allTranslationKeys = new Set(Object.keys(de));

  function assertAllValuesAreValidTranslationKeys(mapping: Record<string | number, string>, name: string) {
    for (const [key, translationKey] of Object.entries(mapping)) {
      if (!allTranslationKeys.has(translationKey)) {
        throw new Error(`${name}[${key}] maps to "${translationKey}" which is not a valid translation key in de.ts`);
      }
    }
  }

  describe("attribute mappings", () => {
    it("maps all 8 attributes to valid translation keys", () => {
      expect(Object.keys(attributeKeys)).toHaveLength(8);
      assertAllValuesAreValidTranslationKeys(attributeKeys, "attributeKeys");
    });

    it("includes all expected attributes", () => {
      const expectedAttributes = [
        "courage",
        "intelligence",
        "concentration",
        "charisma",
        "mentalResilience",
        "dexterity",
        "endurance",
        "strength",
      ];
      for (const attr of expectedAttributes) {
        expect(attributeKeys).toHaveProperty(attr);
      }
    });
  });

  describe("base value mappings", () => {
    it("maps all 11 base values to valid translation keys", () => {
      expect(Object.keys(baseValueKeys)).toHaveLength(11);
      assertAllValuesAreValidTranslationKeys(baseValueKeys, "baseValueKeys");
    });
  });

  describe("skill category mappings", () => {
    it("maps all skill categories to valid translation keys", () => {
      assertAllValuesAreValidTranslationKeys(skillCategoryKeys, "skillCategoryKeys");
    });

    it("covers all skill categories from api-spec", () => {
      for (const category of skillCategories) {
        expect(skillCategoryKeys).toHaveProperty(category);
      }
    });
  });

  describe("skill name mappings", () => {
    it("has at least 75 skill name mappings", () => {
      expect(Object.keys(skillNameKeys).length).toBeGreaterThanOrEqual(75);
    });

    it("all skill name mappings point to valid translation keys", () => {
      assertAllValuesAreValidTranslationKeys(skillNameKeys, "skillNameKeys");
    });
  });

  describe("advantage name mappings", () => {
    it("maps all AdvantagesNames enum values to valid translation keys", () => {
      assertAllValuesAreValidTranslationKeys(advantageNameKeys, "advantageNameKeys");
    });

    it("covers all enum entries", () => {
      const enumValues = Object.values(AdvantagesNames).filter((v) => typeof v === "number");
      for (const val of enumValues) {
        expect(advantageNameKeys).toHaveProperty(String(val));
      }
    });
  });

  describe("disadvantage name mappings", () => {
    it("maps all DisadvantagesNames enum values to valid translation keys", () => {
      assertAllValuesAreValidTranslationKeys(disadvantageNameKeys, "disadvantageNameKeys");
    });

    it("covers all enum entries", () => {
      const enumValues = Object.values(DisadvantagesNames).filter((v) => typeof v === "number");
      for (const val of enumValues) {
        expect(disadvantageNameKeys).toHaveProperty(String(val));
      }
    });
  });

  describe("history record type mappings", () => {
    it("maps all HistoryRecordType enum values to valid translation keys", () => {
      assertAllValuesAreValidTranslationKeys(historyRecordTypeKeys, "historyRecordTypeKeys");
    });

    it("covers all enum entries", () => {
      const enumValues = Object.values(HistoryRecordType).filter((v) => typeof v === "number");
      for (const val of enumValues) {
        expect(historyRecordTypeKeys).toHaveProperty(String(val));
      }
    });
  });

  describe("level up effect mappings", () => {
    it("maps all level-up effects to valid translation keys", () => {
      assertAllValuesAreValidTranslationKeys(levelUpEffectKeys, "levelUpEffectKeys");
    });

    it("includes key effects", () => {
      expect(levelUpEffectKeys).toHaveProperty("hpRoll");
      expect(levelUpEffectKeys).toHaveProperty("armorLevelRoll");
      expect(levelUpEffectKeys).toHaveProperty("initiativePlusOne");
    });
  });

  describe("learning method mappings", () => {
    it("maps all 4 learning methods to valid translation keys", () => {
      expect(Object.keys(learningMethodKeys)).toHaveLength(4);
      assertAllValuesAreValidTranslationKeys(learningMethodKeys, "learningMethodKeys");
    });

    it("covers all learning methods", () => {
      for (const method of ["FREE", "LOW_PRICED", "NORMAL", "EXPENSIVE"]) {
        expect(learningMethodKeys).toHaveProperty(method);
      }
    });
  });
});
