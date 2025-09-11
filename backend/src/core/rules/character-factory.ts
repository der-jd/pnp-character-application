import {
  Attribute,
  BaseValue,
  CharacterSheet,
  CombatValues,
  Skill,
  ATTRIBUTE_POINTS_FOR_CREATION,
  MIN_LEVEL,
  START_SKILLS,
  SkillName,
  combatSkills,
  BodySkillName,
  SocialSkillName,
  NatureSkillName,
  KnowledgeSkillName,
  HandcraftSkillName,
} from "api-spec";
import { COST_CATEGORY_COMBAT_SKILLS, COST_CATEGORY_DEFAULT } from "./constants.js";

export function createEmptyCharacterSheet(): CharacterSheet {
  console.log("Create empty character sheet");

  const zeroAttribute = (): Attribute => ({ start: 0, current: 0, mod: 0, totalCost: 0 });
  const zeroBaseValue = (): BaseValue => ({ start: 0, current: 0, mod: 0 }); // TODO by formula and byLvlUp. See baseValueFormulas and baseValuesNotUpdatableByLvlUp

  const zeroSkill = (skillName: SkillName): Skill => {
    return {
      activated: START_SKILLS.includes(skillName) ? true : false,
      start: 0,
      current: 0,
      mod: 0,
      totalCost: 0,
      defaultCostCategory: combatSkills.includes(skillName) ? COST_CATEGORY_COMBAT_SKILLS : COST_CATEGORY_DEFAULT,
    };
  };

  const zeroCombatValues = (): CombatValues => ({
    availablePoints: 0,
    attackValue: 0,
    paradeValue: 0,
  });

  const createSkillObjectsFromSkillNamesArray = (skillNames: readonly SkillName[]) =>
    Object.fromEntries(skillNames.map((name) => [name, zeroSkill(name)]));

  const bodySkillNames = Object.keys({} as CharacterSheet["skills"]["body"]) as BodySkillName[];
  const socialSkillNames = Object.keys({} as CharacterSheet["skills"]["social"]) as SocialSkillName[];
  const natureSkillNames = Object.keys({} as CharacterSheet["skills"]["nature"]) as NatureSkillName[];
  const knowledgeSkillNames = Object.keys({} as CharacterSheet["skills"]["knowledge"]) as KnowledgeSkillName[];
  const handcraftSkillNames = Object.keys({} as CharacterSheet["skills"]["handcraft"]) as HandcraftSkillName[];

  return {
    generalInformation: {
      name: "",
      level: MIN_LEVEL,
      sex: "",
      profession: { name: "", skill: "{skillCategory}/{skillName}" },
      hobby: { name: "", skill: "<skillCategory/{skillName}" },
      birthday: "",
      birthplace: "",
      size: "",
      weight: "",
      hairColor: "",
      eyeColor: "",
      residence: "",
      appearance: "",
      specialCharacteristics: "",
    },
    calculationPoints: {
      adventurePoints: { start: 0, available: 0, total: 0 },
      attributePoints: {
        start: ATTRIBUTE_POINTS_FOR_CREATION,
        available: ATTRIBUTE_POINTS_FOR_CREATION,
        total: ATTRIBUTE_POINTS_FOR_CREATION,
      },
    },
    advantages: [],
    disadvantages: [],
    specialAbilities: [],
    baseValues: {
      healthPoints: zeroBaseValue(),
      mentalHealth: zeroBaseValue(),
      armorLevel: zeroBaseValue(),
      naturalArmor: zeroBaseValue(),
      initiativeBaseValue: zeroBaseValue(),
      attackBaseValue: zeroBaseValue(),
      paradeBaseValue: zeroBaseValue(),
      rangedAttackBaseValue: zeroBaseValue(),
      luckPoints: zeroBaseValue(),
      bonusActionsPerCombatRound: zeroBaseValue(),
      legendaryActions: zeroBaseValue(),
    },
    attributes: {
      courage: zeroAttribute(),
      intelligence: zeroAttribute(),
      concentration: zeroAttribute(),
      charisma: zeroAttribute(),
      mentalResilience: zeroAttribute(),
      dexterity: zeroAttribute(),
      endurance: zeroAttribute(),
      strength: zeroAttribute(),
    },
    skills: {
      combat: createSkillObjectsFromSkillNamesArray(combatSkills) as CharacterSheet["skills"]["combat"],
      body: createSkillObjectsFromSkillNamesArray(bodySkillNames) as CharacterSheet["skills"]["body"],
      social: createSkillObjectsFromSkillNamesArray(socialSkillNames) as CharacterSheet["skills"]["social"],
      nature: createSkillObjectsFromSkillNamesArray(natureSkillNames) as CharacterSheet["skills"]["nature"],
      knowledge: createSkillObjectsFromSkillNamesArray(knowledgeSkillNames) as CharacterSheet["skills"]["knowledge"],
      handcraft: createSkillObjectsFromSkillNamesArray(handcraftSkillNames) as CharacterSheet["skills"]["handcraft"],
    },
    combatValues: {
      melee: {
        martialArts: zeroCombatValues(),
        barehanded: zeroCombatValues(),
        chainWeapons: zeroCombatValues(),
        daggers: zeroCombatValues(),
        slashingWeaponsSharp1h: zeroCombatValues(),
        slashingWeaponsBlunt1h: zeroCombatValues(),
        thrustingWeapons1h: zeroCombatValues(),
        slashingWeaponsSharp2h: zeroCombatValues(),
        slashingWeaponsBlunt2h: zeroCombatValues(),
        thrustingWeapons2h: zeroCombatValues(),
      },
      ranged: {
        missile: zeroCombatValues(),
        firearmSimple: zeroCombatValues(),
        firearmMedium: zeroCombatValues(),
        firearmComplex: zeroCombatValues(),
        heavyWeapons: zeroCombatValues(),
      },
    },
  };
}
