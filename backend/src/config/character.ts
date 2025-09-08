import { CharacterSheet, Attribute, BaseValue, Skill, CombatValues } from "api-spec";

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
