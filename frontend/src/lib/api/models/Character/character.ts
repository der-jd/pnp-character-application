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

export interface CalculationPoints {
  start: number;
  available: number;
  total: number;
}

export interface Attribute {
  start: number;
  current: number;
  mod: number;
  totalCost: number;
}

export interface BaseValue {
  start: number;
  current: number; // byFormula + byLvlUp + increased (not implemented atm)
  byFormula?: number; // Some base values are not changed by a formula
  byLvlUp?: number; // Some base values can't be changed by level up
  mod: number;
  totalCost?: number; // No base values can be increased by points atm
}

export interface Skill {
  activated: boolean;
  start: number;
  current: number;
  mod: number;
  totalCost: number;
  defaultCostCategory: CostCategory;
}

export interface CombatValues {
  availablePoints: number;
  attackValue: number;
  paradeValue: number;
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
    adventurePoints: CalculationPoints;
    attributePoints: CalculationPoints;
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
  skills: {
    combat: {
      martialArts: Skill;
      barehanded: Skill;
      chainWeapons: Skill;
      daggers: Skill;
      slashingWeaponsSharp1h: Skill;
      slashingWeaponsBlunt1h: Skill;
      thrustingWeapons1h: Skill;
      slashingWeaponsSharp2h: Skill;
      slashingWeaponsBlunt2h: Skill;
      thrustingWeapons2h: Skill;
      missile: Skill;
      firearmSimple: Skill;
      firearmMedium: Skill;
      firearmComplex: Skill;
      heavyWeapons: Skill;
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
      stonework: Skill;
      fabricProcessing: Skill;
      alcoholProduction: Skill;
      steeringVehicles: Skill;
      fineMechanics: Skill;
      cheating: Skill;
      bargaining: Skill;
      firstAid: Skill;
      calmingSbDown: Skill;
      drawingAndPainting: Skill;
      makingMusic: Skill;
      lockpicking: Skill;
    };
  };
  combatValues: {
    melee: {
      martialArts: CombatValues;
      barehanded: CombatValues;
      chainWeapons: CombatValues;
      daggers: CombatValues;
      slashingWeaponsSharp1h: CombatValues;
      slashingWeaponsBlunt1h: CombatValues;
      thrustingWeapons1h: CombatValues;
      slashingWeaponsSharp2h: CombatValues;
      slashingWeaponsBlunt2h: CombatValues;
      thrustingWeapons2h: CombatValues;
    };
    ranged: {
      missile: CombatValues;
      firearmSimple: CombatValues;
      firearmMedium: CombatValues;
      firearmComplex: CombatValues;
      heavyWeapons: CombatValues;
    };
  };
}
