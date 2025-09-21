import { isDeepStrictEqual } from "util";
import { BaseValues, CombatStats, SkillName, Skill, CombatSection } from "api-spec";
import { HttpError } from "../errors.js";
import { getCombatCategory } from "../character-utils.js";

const INCREASE_COST_COMBAT_STATS = 1;

export function combatStatsChanged(combatStatsOld: CombatStats, combatStatsNew: CombatStats): boolean {
  return !isDeepStrictEqual(combatStatsOld, combatStatsNew);
}

export function calculateCombatStats(
  combatSkillName: SkillName,
  oldCombatSkill: Skill | null,
  newCombatSkill: Skill | null,
  baseValues: BaseValues,
  currentCombatStats: CombatStats,
  skilledAttackIncrease: number = 0,
  skilledParadeIncrease: number = 0,
): CombatStats {
  console.log(`Calculate combat stats for skill ${combatSkillName}`);

  const updatedCombatStats = structuredClone(currentCombatStats);

  adjustAvailablePoints(updatedCombatStats, oldCombatSkill, newCombatSkill);

  applySkilledValueIncreases(updatedCombatStats, combatSkillName, skilledAttackIncrease, skilledParadeIncrease);

  recalculateDerivedValues(updatedCombatStats, combatSkillName, baseValues);

  return updatedCombatStats;
}

function adjustAvailablePoints(
  combatStats: CombatStats,
  oldCombatSkill: Skill | null,
  newCombatSkill: Skill | null,
): void {
  if (oldCombatSkill && newCombatSkill) {
    combatStats.availablePoints +=
      newCombatSkill.current - oldCombatSkill.current + (newCombatSkill.mod - oldCombatSkill.mod);
  }
  console.log(`Available points: ${combatStats.availablePoints}`);
}

function applySkilledValueIncreases(
  combatStats: CombatStats,
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
    if (INCREASE_COST_COMBAT_STATS > combatStats.availablePoints) {
      throw new HttpError(400, "Not enough points to increase the attack value!", {
        combatSkillName: combatSkillName,
        skilledAttackValue: combatStats.skilledAttackValue,
        availablePoints: combatStats.availablePoints,
      });
    }
    console.debug(`Skilled attack value: ${combatStats.skilledAttackValue}`);
    console.debug(`Available points: ${combatStats.availablePoints}`);
    console.debug(`Increasing attack value by 1 for ${INCREASE_COST_COMBAT_STATS} point...`);
    combatStats.skilledAttackValue += 1;
    combatStats.availablePoints -= INCREASE_COST_COMBAT_STATS;
  }

  console.log(`Increasing skilled parade value by ${skilledParadeIncrease} points...`);
  for (let i = 0; i < skilledParadeIncrease; i++) {
    console.debug("---------------------------");
    if (INCREASE_COST_COMBAT_STATS > combatStats.availablePoints) {
      throw new HttpError(400, "Not enough points to increase the parade value!", {
        combatSkillName: combatSkillName,
        skilledParadeValue: combatStats.skilledParadeValue,
        availablePoints: combatStats.availablePoints,
      });
    }
    console.debug(`Skilled parade value: ${combatStats.skilledParadeValue}`);
    console.debug(`Available points: ${combatStats.availablePoints}`);
    console.debug(`Increasing parade value by 1 for ${INCREASE_COST_COMBAT_STATS} point...`);
    combatStats.skilledParadeValue += 1;
    combatStats.availablePoints -= INCREASE_COST_COMBAT_STATS;
  }
}

function recalculateDerivedValues(combatStats: CombatStats, combatSkillName: SkillName, baseValues: BaseValues): void {
  const combatCategory = getCombatCategory(combatSkillName);
  const meleeCategory: keyof CombatSection = "melee";
  const rangedCategory: keyof CombatSection = "ranged";
  const isMelee = combatCategory === meleeCategory;
  const isRanged = combatCategory === rangedCategory;

  if (isMelee) {
    combatStats.attackValue =
      combatStats.skilledAttackValue + baseValues.attackBaseValue.current + baseValues.attackBaseValue.mod;
    combatStats.paradeValue =
      combatStats.skilledParadeValue + baseValues.paradeBaseValue.current + baseValues.paradeBaseValue.mod;
  } else if (isRanged) {
    combatStats.attackValue =
      combatStats.skilledAttackValue + baseValues.rangedAttackBaseValue.current + baseValues.rangedAttackBaseValue.mod;
  } else {
    throw new Error(`Invalid combat category ${combatCategory} for skill ${combatSkillName}`);
  }

  console.log(`Attack value: ${combatStats.attackValue}`);
  console.log(`Parade value: ${combatStats.paradeValue}`);
}
