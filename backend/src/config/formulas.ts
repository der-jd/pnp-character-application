import { Attribute, CharacterSheet } from "api-spec";

type AttributeName = keyof CharacterSheet["attributes"];
type BaseValueName = keyof CharacterSheet["baseValues"];
type FormulaFn = (attributes: Record<AttributeName, Attribute>) => number;

const baseValueFormulas: Record<BaseValueName, FormulaFn> = {
  healthPoints: (attributes) =>
    2 * (attributes.endurance.current + attributes.endurance.mod) +
    (attributes.strength.current + attributes.strength.mod) +
    20,
  mentalHealth: (attributes) =>
    attributes.courage.current +
    attributes.courage.mod +
    2 * (attributes.mentalResilience.current + attributes.mentalResilience.mod) +
    8,
  armorLevel: () => 0,
  naturalArmor: () => 0,
  initiativeBaseValue: (attributes) =>
    (2 * (attributes.courage.current + attributes.courage.mod) +
      (attributes.dexterity.current + attributes.dexterity.mod) +
      (attributes.endurance.current + attributes.endurance.mod)) /
    5,
  attackBaseValue: (attributes) =>
    (10 *
      (attributes.courage.current +
        attributes.courage.mod +
        attributes.dexterity.current +
        attributes.dexterity.mod +
        attributes.strength.current +
        attributes.strength.mod)) /
    5,
  paradeBaseValue: (attributes) =>
    (10 *
      (attributes.endurance.current +
        attributes.endurance.mod +
        attributes.dexterity.current +
        attributes.dexterity.mod +
        attributes.strength.current +
        attributes.strength.mod)) /
    5,
  rangedAttackBaseValue: (attributes) =>
    (10 *
      (attributes.concentration.current +
        attributes.concentration.mod +
        attributes.dexterity.current +
        attributes.dexterity.mod +
        attributes.strength.current +
        attributes.strength.mod)) /
    5,
  luckPoints: () => 0,
  bonusActionsPerCombatRound: () => 0,
  legendaryActions: () => 0,
};

export function calculateBaseValues(attributes: Record<AttributeName, Attribute>): Record<BaseValueName, number> {
  const result: Partial<Record<BaseValueName, number>> = {};

  for (const baseValueName of Object.keys(baseValueFormulas) as BaseValueName[]) {
    const formula = baseValueFormulas[baseValueName];
    result[baseValueName] = Math.round(formula(attributes));
  }

  return result as Record<BaseValueName, number>;
}
