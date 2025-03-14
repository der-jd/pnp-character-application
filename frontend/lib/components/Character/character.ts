export enum LearningMethod {
  FREE = 99, // Cost Category 0
  LOW_PRICED = -1, // Cost Category -1
  NORMAL = 0, // Default Cost Category
  EXPENSIVE = 1, // Cost Category +1
}

export enum CostCategory {
  CAT_0 = 0,
  CAT_1 = 1,
  CAT_2 = 2,
  CAT_3 = 3,
  CAT_4 = 4,
}

export interface Character {
  userId: string;
  characterId: string;
  characterSheet: CharacterSheet;
}

export interface Attribute {
  start: number;
  current: number;
  mod: number;
  totalCost: number;
}

export interface BaseValue {
  start: number;
  current: number;
  byLvlUp: number;
  mod: number;
  totalCost: number;
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
      skill: string;
    };
    hobby: {
      name: string;
      skill: string;
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
      start: number;
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
  specialAbilities: string[];
  baseValues: {
    healthPoints: BaseValue;
    mentalHealth: BaseValue;
    armorLevel: BaseValue;
    naturalArmor: BaseValue;
    initiativeBaseValue: BaseValue;
    attackBaseValue: BaseValue;
    paradeBaseValue: BaseValue;
    rangedAttackBaseValue: BaseValue;
    luckPoints: BaseValue;
    bonusActionsPerCombatRound: BaseValue;
    legendaryActions: BaseValue;
  };
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
  // TODO consolidate skills. Some of them are too special and probably never used
  skills: {
    combat: {
      martialArts: Skill;
      barehanded: Skill;
      chainWeapons: Skill;
      daggers: Skill;
      slashingWeapons1h: Skill;
      thrustingWeapons1h: Skill;
      slashingWeapons2h: Skill;
      thrustingWeapons2h: Skill;
      polearms: Skill;
      greatsword: Skill;
      missile: Skill;
      firearmSimple: Skill;
      firearmMedium: Skill;
      firearmComplex: Skill;
    };
    body: {
      athletics: Skill;
      juggleries: Skill;
      climbing: Skill;
      bodyControl: Skill;
      riding: Skill;
      sneaking: Skill;
      swimming: Skill;
      selfControl: Skill;
      hiding: Skill;
      singing: Skill;
      sharpnessOfSenses: Skill;
      imitatingVoices: Skill;
      dancing: Skill;
      quaffing: Skill;
      pickpocketing: Skill;
    };
    social: {
      seduction: Skill;
      etiquette: Skill;
      teaching: Skill;
      acting: Skill;
      writtenExpression: Skill;
      disguising: Skill;
      streetKnowledge: Skill;
      knowledgeOfHumanNature: Skill;
      persuading: Skill;
      convincing: Skill;
    };
    nature: {
      tracking: Skill;
      knottingSkills: Skill;
      trapping: Skill;
      fishing: Skill;
      orientation: Skill;
      wildernessLife: Skill;
    };
    knowledge: {
      anatomy: Skill;
      architecture: Skill;
      geography: Skill;
      history: Skill;
      petrology: Skill;
      botany: Skill;
      philosophy: Skill;
      astronomy: Skill;
      mathematics: Skill;
      knowledgeOfTheLaw: Skill;
      estimating: Skill;
      zoology: Skill;
      technology: Skill;
      chemistry: Skill;
      warfare: Skill;
      itSkills: Skill;
      mechanics: Skill;
    };
    handcraft: {
      training: Skill;
      woodwork: Skill;
      foodProcessing: Skill;
      leatherProcessing: Skill;
      metalwork: Skill;
      stoneWork: Skill;
      fabricProcessing: Skill;
      alcoholProduction: Skill;
      steeringVehicles: Skill;
      cheating: Skill;
      bargaining: Skill;
      firstAid: Skill;
      calmingSbDown: Skill;
      drawingAndPainting: Skill;
      makingMusic: Skill;
      lockpicking: Skill;
    };
  };
  combatSkills: {
    melee: {
      martialArts: CombatSkill;
      barehanded: CombatSkill;
      chainWeapons: CombatSkill;
      daggers: CombatSkill;
      slashingWeapons1h: CombatSkill;
      thrustingWeapons1h: CombatSkill;
      slashingWeapons2h: CombatSkill;
      thrustingWeapons2h: CombatSkill;
      polearms: CombatSkill;
      greatsword: CombatSkill;
    };
    ranged: {
      missile: CombatSkill;
      firearmSimple: CombatSkill;
      firearmMedium: CombatSkill;
      firearmComplex: CombatSkill;
    };
  };
}
