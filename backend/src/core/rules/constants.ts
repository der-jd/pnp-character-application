import { CostCategory, CombatSkillName, LevelUpEffectKind } from "api-spec";

export const COST_CATEGORY_DEFAULT = CostCategory.CAT_2;
export const COST_CATEGORY_COMBAT_SKILLS = CostCategory.CAT_3;

export const MAX_COST_CATEGORY = CostCategory.CAT_4;
export const MIN_COST_CATEGORY = CostCategory.CAT_0;

export const SKILL_THRESHOLDS = [50, 75, 99999];

/**
 * +------------+-------------+-------------+-------------+
 * |  Category  | Threshold 1 | Threshold 2 | Threshold 3 |
 * +------------+-------------+-------------+-------------+
 * |     0      |      x      |      x      |      x      |
 * |     1      |      x      |      x      |      x      |
 * |     2      |      x      |      x      |      x      |
 * |     3      |      x      |      x      |      x      |
 * |     4      |      x      |      x      |      x      |
 * +------------+-------------+-------------+-------------+
 */
export const COST_MATRIX: number[][] = [
  [0, 0, 0],
  [0.5, 1, 2],
  [1, 2, 3],
  [2, 3, 4],
  [3, 4, 5],
];

/**
 * +------------+-------------+
 * |  Category  |    Cost     |
 * +------------+-------------+
 * |     0      |      x      |
 * |     1      |      x      |
 * |     2      |      x      |
 * |     3      |      x      |
 * |     4      |      x      |
 * +------------+-------------+
 */
export const SKILL_ACTIVATION_COSTS: number[] = [0, 40, 50, 60, 70];

const combatSkillsHandling: Record<CombatSkillName, number> = {
  // melee
  martialArts: 25,
  barehanded: 25,
  chainWeapons: 15,
  daggers: 25,
  slashingWeaponsSharp1h: 25,
  slashingWeaponsBlunt1h: 25,
  thrustingWeapons1h: 20,
  slashingWeaponsSharp2h: 15,
  slashingWeaponsBlunt2h: 15,
  thrustingWeapons2h: 15,
  // ranged
  missile: 15,
  firearmSimple: 30,
  firearmMedium: 20,
  firearmComplex: 10,
  heavyWeapons: 5,
};

export function getCombatSkillHandling(combatSkillName: CombatSkillName): number {
  if (!(combatSkillName in combatSkillsHandling)) {
    throw new Error(`Combat skill name '${combatSkillName}' is not found in handling map!`);
  }

  return combatSkillsHandling[combatSkillName];
}

type LevelUpOptionConfig = {
  firstAllowedLevel: number;
  cooldownLevels: number;
  maxSelectionCount: number;
};

export const levelUpOptionsConfig: Record<LevelUpEffectKind, LevelUpOptionConfig> = {
  hpRoll: {
    firstAllowedLevel: 2,
    cooldownLevels: 0,
    maxSelectionCount: Number.POSITIVE_INFINITY,
  },
  armorLevelRoll: {
    firstAllowedLevel: 2,
    cooldownLevels: 2,
    maxSelectionCount: Number.POSITIVE_INFINITY,
  },
  initiativePlusOne: {
    firstAllowedLevel: 2,
    cooldownLevels: 1,
    maxSelectionCount: Number.POSITIVE_INFINITY,
  },
  luckPlusOne: {
    firstAllowedLevel: 2,
    cooldownLevels: 2,
    maxSelectionCount: 3,
  },
  bonusActionPlusOne: {
    firstAllowedLevel: 6,
    cooldownLevels: 9,
    maxSelectionCount: 3,
  },
  legendaryActionPlusOne: {
    firstAllowedLevel: 11,
    cooldownLevels: 9,
    maxSelectionCount: 3,
  },
  rerollUnlock: {
    firstAllowedLevel: 2,
    cooldownLevels: Number.POSITIVE_INFINITY,
    maxSelectionCount: 1,
  },
};
