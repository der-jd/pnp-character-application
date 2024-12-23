export enum LearningMethod {
  FREE, // Cost Category 0
  LOW_PRICED, // Cost Category -1
  NORMAL, // Default Cost Category
  EXPENSIVE, // Cost Category +1
}

export enum CostCategory {
  CAT_0,
  CAT_1,
  CAT_2,
  CAT_3,
  CAT_4,
}

export interface Character {
  characterId: string;
  characterSheet: CharacterSheet;
}

export interface Attribute {
  start: number;
  current: number;
  mod: number;
}

export interface BaseValue {
  start: number;
  current: number;
  mod: number;
}

export interface Skill {
  activated: boolean;
  start: number;
  current: number;
  mod: number;
  totalCost: number;
  defaultCostCategory: CostCategory;
}

export interface CombatSkill {
  handling: number;
  attackDistributed: number;
  paradeDistributed: number;
}

export interface CharacterSheet {
  generalInformation: {
    name: string;
    level: number;
    sex: string;
    profession: {
      name: string;
      Skill: string;
    };
    hobby: {
      name: string;
      Skill: string;
    };
    birthday: string;
    birthplace: string;
    size: string;
    weight: string;
    hairColor: string;
    eyeColor: string;
    residence: string;
    appearance: string;
    specialCharacteristics: string;
  };
  calculationPoints: {
    adventurePoints: {
      available: number;
      total: number;
    };
    attributePoints: {
      start: number;
      available: number;
      total: number;
    };
  };
  advantages: string[];
  disadvantages: string[];
  attributes: {
    courage: Attribute;
    intelligence: Attribute;
    concentration: Attribute;
    charisma: Attribute;
    mentalResilience: Attribute;
    dexterity: Attribute;
    endurance: Attribute;
    strength: Attribute;
  };
  baseValues: {
    healthPoints: BaseValue;
    mentalHealth: BaseValue;
    armorLevel: BaseValue;
    initiativeBaseValue: BaseValue;
    attackBaseValue: BaseValue;
    paradeBaseValue: BaseValue;
    rangedAttackBaseValue: BaseValue;
    luckPoints: BaseValue;
    bonusActionsPerCombatRound: BaseValue;
    legendaryActions: BaseValue;
  };
  skills: {
    combat: {
      greatsword: Skill;
      martialArt: Skill;
      firearmSimple: Skill;
      missile: Skill;
    };
    body: {
      athletics: Skill;
      swimming: Skill;
    };
    social: {
      acting: Skill;
      convincing: Skill;
    };
    nature: {
      fishing: Skill;
      orientation: Skill;
    };
    knowledge: {
      geography: Skill;
      history: Skill;
    };
    handcraft: {
      butcher: Skill;
      lockpicking: Skill;
    };
  };
  combatSkills: {
    melee: {
      greatsword: CombatSkill;
      martialArt: CombatSkill;
    };
    ranged: {
      firearmSimple: CombatSkill;
      missile: CombatSkill;
    };
  };
}
