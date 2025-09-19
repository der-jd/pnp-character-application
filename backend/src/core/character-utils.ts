import {
  CostCategory,
  LearningMethod,
  CharacterSheet,
  Attribute,
  BaseValue,
  Skill,
  CombatValues,
  AdvantagesNames,
  DisadvantagesNames,
  characterSheetSchema,
  SkillCategory,
  SkillName,
  skillCategories,
  skillNames,
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

export function getCombatValues(
  combatValues: CharacterSheet["combatValues"],
  category: keyof CharacterSheet["combatValues"],
  combatSkillName: SkillName,
): CombatValues {
  if (!(category in combatValues)) {
    throw new Error(`Category ${category} is not a valid combat category!`);
  }

  const combatCategory = combatValues[category] as Record<string, CombatValues>;
  const skillCombatValues = combatCategory[combatSkillName];
  if (!skillCombatValues) {
    throw new Error(`Combat values for skill ${combatSkillName} not found!`);
  }
  return skillCombatValues;
}

export function getCombatCategory(combatSkillName: SkillName): keyof CharacterSheet["combatValues"] {
  const meleeSkills = Object.keys(characterSheetSchema.shape.combatValues.shape.melee.shape);
  const rangedSkills = Object.keys(characterSheetSchema.shape.combatValues.shape.ranged.shape);

  if (meleeSkills.includes(combatSkillName)) {
    const meleeCategory: keyof CharacterSheet["combatValues"] = "melee";
    return meleeCategory;
  } else if (rangedSkills.includes(combatSkillName)) {
    const rangedCategory: keyof CharacterSheet["combatValues"] = "ranged";
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
