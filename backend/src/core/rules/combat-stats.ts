import { isDeepStrictEqual } from "util";
import { BaseValues, CombatStats, SkillName, Skill, CombatSection } from "api-spec";
import { HttpError } from "../errors.js";
import { getCombatCategory } from "../character-utils.js";
import { updateCombatStats } from "../dynamodb_characters.js";

const INCREASE_COST_COMBAT_STATS = 1;

export function combatBaseValuesChangedAffectingCombatStats(
  oldBaseValues: Partial<BaseValues>,
  newBaseValues: Partial<BaseValues>
): boolean {
  const attackBaseValueKey: keyof BaseValues = "attackBaseValue";
  const paradeBaseValueKey: keyof BaseValues = "paradeBaseValue";
  const rangedAttackBaseValueKey: keyof BaseValues = "rangedAttackBaseValue";

  for (const key of [attackBaseValueKey, paradeBaseValueKey, rangedAttackBaseValueKey]) {
    const newValue = newBaseValues[key];
    const oldValue = oldBaseValues[key];

    if (newValue && !oldValue) {
      return true;
    }

    if (newValue && oldValue) {
      if (oldValue.mod !== newValue.mod || oldValue.current !== newValue.current) {
        return true;
      }
    }
  }

  return false;
}

export function combatStatsChanged(combatStatsOld: CombatStats, combatStatsNew: CombatStats): boolean {
  return !isDeepStrictEqual(combatStatsOld, combatStatsNew);
}

export async function recalculateAndUpdateCombatStats(
  userId: string,
  characterId: string,
  combatSection: CombatSection,
  baseValues: BaseValues
): Promise<Partial<CombatSection>> {
  console.log("Recalculate and update combat stats");
  const combatStatsUpdates: Promise<void>[] = [];
  const changedCombatSection: Partial<CombatSection> = {};

  const combatCategories = Object.keys(combatSection) as (keyof CombatSection)[];
  for (const category of combatCategories) {
    let hasChanges = false;
    const changedCombatCategorySection: Record<string, CombatStats> = {};

    for (const [skillName, oldCombatStats] of Object.entries(combatSection[category])) {
      const newCombatStats = calculateCombatStats(skillName as SkillName, null, null, baseValues, oldCombatStats);

      if (combatStatsChanged(oldCombatStats, newCombatStats)) {
        console.log(`Combat stats for ${category}/${skillName} changed. Persisting...`);
        console.log(`Old combat stats:`, oldCombatStats);
        console.log(`New combat stats:`, newCombatStats);
        combatStatsUpdates.push(updateCombatStats(userId, characterId, category, skillName, newCombatStats));
        hasChanges = true;
        changedCombatCategorySection[skillName] = newCombatStats;
      } else {
        console.log(`Combat stats for ${category}/${skillName} unchanged.`);
      }
    }

    if (hasChanges) {
      /**
       * TypeScript's strict union type checking for CombatSection[keyof CombatSection] requires
       * the value to satisfy both melee and ranged section types simultaneously.
       * Since changedCombatCategorySection (Record<string, CombatStats>) only matches one category
       * at a time (melee or ranged), we use 'as any' to bypass this limitation, as the runtime
       * structure is guaranteed to be correct based on the category loop.
       */
      changedCombatSection[category] = changedCombatCategorySection as any;
    }
  }

  if (combatStatsUpdates.length > 0) {
    await Promise.all(combatStatsUpdates);
  } else {
    console.log("No combat stats changed, nothing to update.");
  }

  return changedCombatSection;
}

export function calculateCombatStats(
  combatSkillName: SkillName,
  oldCombatSkill: Skill | null,
  newCombatSkill: Skill | null,
  baseValues: BaseValues,
  currentCombatStats: CombatStats,
  skilledAttackIncrease: number = 0,
  skilledParadeIncrease: number = 0
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
  newCombatSkill: Skill | null
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
  skilledParadeIncrease: number
): void {
  if (skilledAttackIncrease === 0 && skilledParadeIncrease === 0) {
    return;
  }

  const initialSkilledAttackValue = combatStats.skilledAttackValue;
  const initialSkilledParadeValue = combatStats.skilledParadeValue;
  const initialAvailablePoints = combatStats.availablePoints;

  console.log(`Increasing skilled attack value by ${skilledAttackIncrease} points...`);
  for (let i = 0; i < skilledAttackIncrease; i++) {
    console.debug("---------------------------");
    if (INCREASE_COST_COMBAT_STATS > combatStats.availablePoints) {
      throw new HttpError(400, "Not enough points to increase the attack value!", {
        combatSkillName: combatSkillName,
        skilledAttackValue: initialSkilledAttackValue,
        availablePoints: initialAvailablePoints,
        skilledAttackIncrease: skilledAttackIncrease,
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
        skilledParadeValue: initialSkilledParadeValue,
        availablePoints: initialAvailablePoints,
        skilledParadeIncrease: skilledParadeIncrease,
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
