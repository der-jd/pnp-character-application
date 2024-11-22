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
}

export interface MeleeCombatSkill {
  activated: boolean;
  handling: number;
  start: number;
  current: number;
  mod: number;
  totalCost: number;
  attackDistributed: number;
  paradeDistributed: number;
}

export interface RangedCombatSkill {
  activated: boolean;
  handling: number;
  start: number;
  current: number;
  mod: number;
  totalCost: number;
  rangedDistributed: number;
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
    activated: number;
    combat: {
      melee: {
        greatsword: MeleeCombatSkill;
        martialArt: MeleeCombatSkill;
      };
      ranged: {
        firearmSimple: RangedCombatSkill;
        missile: RangedCombatSkill;
      };
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
}

// TODO this function does not work for combat skills because they have a different structure
export function getSkill(
  skills: CharacterSheet["skills"],
  category: keyof CharacterSheet["skills"],
  name: string,
): Skill {
  const skillCategory = skills[category] as Record<string, any>;
  const skill = skillCategory[name];
  if (!skill) {
    throw new Error(`Skill ${name} not found!`);
  }
  return skill;
}
