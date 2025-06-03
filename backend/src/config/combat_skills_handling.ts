import { CharacterSheet } from "./character.js";

type CombatSkillNames = keyof CharacterSheet["combatValues"]["melee"] | keyof CharacterSheet["combatValues"]["ranged"];

const combatSkillHandlingMap: Record<CombatSkillNames, number> = {
  // melee
  martialArts: 12,
  barehanded: 18,
  chainWeapons: 18,
  daggers: 18,
  slashingWeapons1h: 18,
  thrustingWeapons1h: 18,
  slashingWeapons2h: 18,
  thrustingWeapons2h: 18,
  polearms: 18,
  greatsword: 18,
  // ranged
  missile: 8,
  firearmSimple: 10,
  firearmMedium: 18,
  firearmComplex: 18,
};

export function getCombatSkillHandling(combatSkillName: string): number {
  if (!(combatSkillName in combatSkillHandlingMap)) {
    throw new Error(`Combat skill name '${combatSkillName}' is invalid (handling value not found)!`);
  }

  return combatSkillHandlingMap[combatSkillName as CombatSkillNames];
}
