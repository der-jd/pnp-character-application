import { Attributes, BaseValues } from "api-spec";

type BaseValueName = keyof BaseValues;
type FormulaFn = (attributes: Attributes) => number | undefined;

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
  armorLevel: () => undefined,
  naturalArmor: () => undefined,
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
  luckPoints: () => undefined,
  bonusActionsPerCombatRound: () => undefined,
  legendaryActions: () => undefined,
};

export function calculateBaseValues(attributes: Attributes): Record<BaseValueName, number | undefined> {
  const result: Partial<Record<BaseValueName, number | undefined>> = {};

  for (const baseValueName of Object.keys(baseValueFormulas) as BaseValueName[]) {
    const formula = baseValueFormulas[baseValueName];
    const value = formula(attributes);
    console.debug(`Raw formula result for base value ${baseValueName}: ${value}`);
    result[baseValueName] = value ? Math.round(value) : undefined;
  }

  return result as Record<BaseValueName, number | undefined>;
}
