import { CombatSkillName, LevelUpEffectKind, MAX_LEVEL } from "api-spec";

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
    maxSelectionCount: MAX_LEVEL - 1, // The character starts at level 1
  },
  armorLevelRoll: {
    firstAllowedLevel: 2,
    cooldownLevels: 2,
    maxSelectionCount: MAX_LEVEL - 1, // The character starts at level 1
  },
  initiativePlusOne: {
    firstAllowedLevel: 2,
    cooldownLevels: 1,
    maxSelectionCount: MAX_LEVEL - 1, // The character starts at level 1
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
    cooldownLevels: MAX_LEVEL,
    maxSelectionCount: 1,
  },
};
