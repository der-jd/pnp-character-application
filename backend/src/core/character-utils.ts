import { CostCategory, LearningMethod, CharacterSheet, Attribute, BaseValue, Skill, CombatValues } from "api-spec";
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

export function getSkill(
  skills: CharacterSheet["skills"],
  category: keyof CharacterSheet["skills"],
  name: string,
): Skill {
  const skillCategory = skills[category] as Record<string, Skill>;
  const skill = skillCategory[name];
  if (!skill) {
    throw new Error(`Skill ${name} not found!`);
  }
  return skill;
}

export function getCombatValues(
  combatValues: CharacterSheet["combatValues"],
  category: keyof CharacterSheet["combatValues"],
  combatSkillName: string,
): CombatValues {
  const combatCategory = combatValues[category] as Record<string, CombatValues>;
  const skillCombatValues = combatCategory[combatSkillName];
  if (!skillCombatValues) {
    throw new Error(`Combat values for skill ${combatSkillName} not found!`);
  }
  return skillCombatValues;
}

export function getCombatCategory(
  combatValues: CharacterSheet["combatValues"],
  combatSkillName: string,
): keyof CharacterSheet["combatValues"] {
  for (const category in combatValues) {
    const combatCategory = combatValues[category as keyof CharacterSheet["combatValues"]] as Record<string, any>;
    if (combatCategory[combatSkillName]) {
      return category as keyof CharacterSheet["combatValues"];
    }
  }
  throw new Error(`Combat category for skill ${combatSkillName} not found!`);
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
