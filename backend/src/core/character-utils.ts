import {
  CostCategory,
  LearningMethod,
  CharacterSheet,
  Attribute,
  BaseValue,
  Skill,
  CombatStats,
  AdvantagesNames,
  DisadvantagesNames,
  SkillCategory,
  SkillName,
  skillCategories,
  skillNames,
  CombatSection,
  combatSectionSchema,
} from "api-spec";
import {
  SKILL_ACTIVATION_COSTS,
  COST_MATRIX,
  MAX_COST_CATEGORY,
  MIN_COST_CATEGORY,
  SKILL_THRESHOLDS,
} from "./rules/constants.js";

export function getAttribute(attributes: CharacterSheet["attributes"], name: string): Attribute {
  const attribute = (attributes as Record<string, Attribute>)[name];
  if (!attribute) {
    throw new Error(`Attribute ${name} not found!`);
  }
  return attribute;
}

export function getBaseValue(baseValues: CharacterSheet["baseValues"], name: string): BaseValue {
  const baseValue = (baseValues as Record<string, BaseValue>)[name];
  if (!baseValue) {
    throw new Error(`Base value ${name} not found!`);
  }
  return baseValue;
}

export function getSkillCategoryAndName(categoryAndName: string): { category: SkillCategory; name: SkillName } {
  // Pattern is "skillCategory/skillName"
  const skillCategory = categoryAndName.split("/")[0] as SkillCategory;
  const skillName = categoryAndName.split("/")[1] as SkillName;

  if (!skillCategories.includes(skillCategory)) {
    throw new Error(`Skill category ${skillCategory} is not valid!`);
  }

  if (!skillNames.includes(skillName)) {
    throw new Error(`Skill name ${skillName} is not valid!`);
  }

  return { category: skillCategory, name: skillName };
}

export function getSkill(skills: CharacterSheet["skills"], category: SkillCategory, name: SkillName): Skill {
  if (!(category in skills)) {
    throw new Error(`Category ${category} is not a valid skill category!`);
  }

  const skillCategory = skills[category] as Record<string, Skill>;
  const skill = skillCategory[name];
  if (!skill) {
    throw new Error(`Skill ${name} not found!`);
  }
  return skill;
}

export function isCombatSkill(skillCategory: string): boolean {
  const combatSkillCategory: SkillCategory = "combat";
  return skillCategory === combatSkillCategory;
}

export function getCombatStats(
  combatSection: CombatSection,
  category: keyof CombatSection,
  combatSkillName: SkillName,
): CombatStats {
  if (!(category in combatSection)) {
    throw new Error(`Category ${category} is not a valid combat category!`);
  }

  const combatCategory = combatSection[category] as Record<string, CombatStats>;
  const combatStats = combatCategory[combatSkillName];
  if (!combatStats) {
    throw new Error(`Combat stats for skill ${category}/${combatSkillName} not found!`);
  }
  return combatStats;
}

export function getCombatCategory(combatSkillName: SkillName): keyof CombatSection {
  const meleeSkills = Object.keys(combatSectionSchema.shape.melee.shape);
  const rangedSkills = Object.keys(combatSectionSchema.shape.ranged.shape);

  if (meleeSkills.includes(combatSkillName)) {
    const meleeCategory: keyof CombatSection = "melee";
    return meleeCategory;
  } else if (rangedSkills.includes(combatSkillName)) {
    const rangedCategory: keyof CombatSection = "ranged";
    return rangedCategory;
  } else {
    throw new Error(`Combat category for skill ${combatSkillName} not found!`);
  }
}

export function parseLearningMethod(method: string): LearningMethod {
  return LearningMethod[method.toUpperCase() as keyof typeof LearningMethod];
}

export function parseCostCategory(category: string): CostCategory {
  return CostCategory[category.toUpperCase() as keyof typeof CostCategory];
}

export function adjustCostCategory(defaultCostCategory: CostCategory, learningMethod: LearningMethod): CostCategory {
  if (learningMethod === LearningMethod.FREE) {
    return CostCategory.CAT_0;
  }

  const adjustedCategory = Number(defaultCostCategory) + Number(learningMethod);

  if (adjustedCategory > MAX_COST_CATEGORY) {
    return MAX_COST_CATEGORY;
  } else if (adjustedCategory < MIN_COST_CATEGORY) {
    return MIN_COST_CATEGORY;
  }

  return adjustedCategory as CostCategory;
}

export function getSkillIncreaseCost(skillValue: number, costCategory: CostCategory): number {
  const columnIndex = SKILL_THRESHOLDS.findIndex((threshold) => skillValue < threshold);
  return COST_MATRIX[costCategory][columnIndex];
}

export function getSkillActivationCost(costCategory: CostCategory): number {
  return SKILL_ACTIVATION_COSTS[costCategory];
}

export function advantagesEnumToString(enumValue: AdvantagesNames): string | undefined {
  return Object.keys(AdvantagesNames).find((key) => AdvantagesNames[key as keyof typeof AdvantagesNames] === enumValue);
}

export function disadvantagesEnumToString(enumValue: DisadvantagesNames): string | undefined {
  return Object.keys(DisadvantagesNames).find(
    (key) => DisadvantagesNames[key as keyof typeof DisadvantagesNames] === enumValue,
  );
}
