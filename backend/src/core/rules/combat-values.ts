import { isDeepStrictEqual } from "util";
import { BaseValue, CombatValues, SkillName, Skill, CharacterSheet } from "api-spec";
import { HttpError } from "../errors.js";
import { getCombatCategory } from "../character-utils.js";

const INCREASE_COST_COMBAT_VALUES = 1;

export function combatValuesChanged(combatValuesOld: CombatValues, combatValuesNew: CombatValues): boolean {
  return !isDeepStrictEqual(combatValuesOld, combatValuesNew);
}

export function calculateCombatValues(
  combatSkillName: SkillName,
  oldCombatSkill: Skill | null,
  newCombatSkill: Skill | null,
  attackBaseValue: BaseValue,
  paradeBaseValue: BaseValue,
  rangedAttackBaseValue: BaseValue,
  currentCombatValues: CombatValues,
  skilledAttackIncrease: number = 0,
  skilledParadeIncrease: number = 0,
): CombatValues {
  console.log(`Calculate combat values for skill ${combatSkillName}`);

  const updatedCombatValues = structuredClone(currentCombatValues);

  adjustAvailablePoints(updatedCombatValues, oldCombatSkill, newCombatSkill);

  applySkilledValueIncreases(updatedCombatValues, combatSkillName, skilledAttackIncrease, skilledParadeIncrease);

  recalculateDerivedValues(
    updatedCombatValues,
    combatSkillName,
    attackBaseValue,
    paradeBaseValue,
    rangedAttackBaseValue,
  );

  return updatedCombatValues;
}

function adjustAvailablePoints(
  combatValues: CombatValues,
  oldCombatSkill: Skill | null,
  newCombatSkill: Skill | null,
): void {
  if (oldCombatSkill && newCombatSkill) {
    combatValues.availablePoints +=
      newCombatSkill.current - oldCombatSkill.current + (newCombatSkill.mod - oldCombatSkill.mod);
  }
  console.log(`Available points: ${combatValues.availablePoints}`);
}

function applySkilledValueIncreases(
  combatValues: CombatValues,
  combatSkillName: SkillName,
  skilledAttackIncrease: number,
  skilledParadeIncrease: number,
): void {
  if (skilledAttackIncrease === 0 && skilledParadeIncrease === 0) {
    return;
  }

  console.log(`Increasing skilled attack value by ${skilledAttackIncrease} points...`);
  for (let i = 0; i < skilledAttackIncrease; i++) {
    console.debug("---------------------------");
    if (INCREASE_COST_COMBAT_VALUES > combatValues.availablePoints) {
      throw new HttpError(400, "Not enough points to increase the attack value!", {
        combatSkillName: combatSkillName,
        skilledAttackValue: combatValues.skilledAttackValue,
        availablePoints: combatValues.availablePoints,
      });
    }
    console.debug(`Skilled attack value: ${combatValues.skilledAttackValue}`);
    console.debug(`Available points: ${combatValues.availablePoints}`);
    console.debug(`Increasing attack value by 1 for ${INCREASE_COST_COMBAT_VALUES} point...`);
    combatValues.skilledAttackValue += 1;
    combatValues.availablePoints -= INCREASE_COST_COMBAT_VALUES;
  }

  console.log(`Increasing skilled parade value by ${skilledParadeIncrease} points...`);
  for (let i = 0; i < skilledParadeIncrease; i++) {
    console.debug("---------------------------");
    if (INCREASE_COST_COMBAT_VALUES > combatValues.availablePoints) {
      throw new HttpError(400, "Not enough points to increase the parade value!", {
        combatSkillName: combatSkillName,
        skilledParadeValue: combatValues.skilledParadeValue,
        availablePoints: combatValues.availablePoints,
      });
    }
    console.debug(`Skilled parade value: ${combatValues.skilledParadeValue}`);
    console.debug(`Available points: ${combatValues.availablePoints}`);
    console.debug(`Increasing parade value by 1 for ${INCREASE_COST_COMBAT_VALUES} point...`);
    combatValues.skilledParadeValue += 1;
    combatValues.availablePoints -= INCREASE_COST_COMBAT_VALUES;
  }
}

function recalculateDerivedValues(
  combatValues: CombatValues,
  combatSkillName: SkillName,
  attackBaseValue: BaseValue,
  paradeBaseValue: BaseValue,
  rangedAttackBaseValue: BaseValue,
): void {
  const combatCategory = getCombatCategory(combatSkillName);
  const meleeCategory: keyof CharacterSheet["combatValues"] = "melee";
  const rangedCategory: keyof CharacterSheet["combatValues"] = "ranged";
  const isMelee = combatCategory === meleeCategory;
  const isRanged = combatCategory === rangedCategory;

  if (isMelee) {
    combatValues.attackValue = combatValues.skilledAttackValue + attackBaseValue.current + attackBaseValue.mod;
    combatValues.paradeValue = combatValues.skilledParadeValue + paradeBaseValue.current + paradeBaseValue.mod;
  } else if (isRanged) {
    combatValues.attackValue =
      combatValues.skilledAttackValue + rangedAttackBaseValue.current + rangedAttackBaseValue.mod;
  } else {
    throw new Error(`Invalid combat category ${combatCategory} for skill ${combatSkillName}`);
  }

  console.log(`Attack value: ${combatValues.attackValue}`);
  console.log(`Parade value: ${combatValues.paradeValue}`);
}
