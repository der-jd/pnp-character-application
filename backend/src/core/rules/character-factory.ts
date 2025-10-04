import { 
  Attribute, 
  BaseValue, 
  CharacterSheet, 
  CombatStats, 
  Skill,
  ATTRIBUTE_POINTS_FOR_CREATION,
  START_SKILLS,
  combatSkills
} from "api-spec";
import {
  COST_CATEGORY_COMBAT_SKILLS,
  COST_CATEGORY_DEFAULT,
} from "./constants.js";

export function createEmptyCharacterSheet(): CharacterSheet {
  const zeroAttribute = (): Attribute => ({ start: 0, current: 0, mod: 0, totalCost: 0 });
  const zeroBaseValue = (): BaseValue => ({ start: 0, current: 0, mod: 0 }); // TODO by formula and byLvlUp. See baseValueFormulas and baseValuesNotUpdatableByLvlUp

  const zeroSkill = (skillName: string, skillCategory?: string): Skill => {
    // Create the full skill name with category for START_SKILLS check
    const fullSkillName = skillCategory ? `${skillCategory}/${skillName}` as any : null;
    const isStartSkill = fullSkillName ? START_SKILLS.includes(fullSkillName) : false;
    const isCombatSkill = combatSkills.some((skill: any) => skill.endsWith(`/${skillName}`));
    
    return {
      activated: isStartSkill,
      start: 0,
      current: 0,
      mod: 0,
      totalCost: 0,
      defaultCostCategory: isCombatSkill
        ? COST_CATEGORY_COMBAT_SKILLS
        : COST_CATEGORY_DEFAULT,
    };
  };

  const zeroCombatStats = (): CombatStats => ({
    availablePoints: 0,
    handling: 0,
    attackValue: 0,
    skilledAttackValue: 0,
    paradeValue: 0,
    skilledParadeValue: 0,
  });

  return {
    generalInformation: {
      name: "",
      level: 0,
      sex: "",
      profession: { name: "", skill: "combat/barehanded" }, // Default to valid format
      hobby: { name: "", skill: "body/athletics" }, // Default to valid format
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
      adventurePoints: { start: ATTRIBUTE_POINTS_FOR_CREATION, available: 0, total: ATTRIBUTE_POINTS_FOR_CREATION },
      attributePoints: { start: 0, available: 0, total: 0 },
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
      combat: {
        martialArts: zeroSkill("martialArts"),
        barehanded: zeroSkill("barehanded"),
        chainWeapons: zeroSkill("chainWeapons"),
        daggers: zeroSkill("daggers"),
        slashingWeaponsSharp1h: zeroSkill("slashingWeaponsSharp1h"),
        slashingWeaponsBlunt1h: zeroSkill("slashingWeaponsBlunt1h"),
        thrustingWeapons1h: zeroSkill("thrustingWeapons1h"),
        slashingWeaponsSharp2h: zeroSkill("slashingWeaponsSharp2h"),
        slashingWeaponsBlunt2h: zeroSkill("slashingWeaponsBlunt2h"),
        thrustingWeapons2h: zeroSkill("thrustingWeapons2h"),
        missile: zeroSkill("missile"),
        firearmSimple: zeroSkill("firearmSimple"),
        firearmMedium: zeroSkill("firearmMedium"),
        firearmComplex: zeroSkill("firearmComplex"),
        heavyWeapons: zeroSkill("heavyWeapons"),
      },
      body: {
        athletics: zeroSkill("athletics"),
        juggleries: zeroSkill("juggleries"),
        climbing: zeroSkill("climbing"),
        bodyControl: zeroSkill("bodyControl"),
        riding: zeroSkill("riding"),
        sneaking: zeroSkill("sneaking"),
        swimming: zeroSkill("swimming"),
        selfControl: zeroSkill("selfControl"),
        hiding: zeroSkill("hiding"),
        singing: zeroSkill("singing"),
        sharpnessOfSenses: zeroSkill("sharpnessOfSenses"),
        dancing: zeroSkill("dancing"),
        quaffing: zeroSkill("quaffing"),
        pickpocketing: zeroSkill("pickpocketing"),
      },
      social: {
        seduction: zeroSkill("seduction"),
        etiquette: zeroSkill("etiquette"),
        teaching: zeroSkill("teaching"),
        acting: zeroSkill("acting"),
        writtenExpression: zeroSkill("writtenExpression"),
        streetKnowledge: zeroSkill("streetKnowledge"),
        knowledgeOfHumanNature: zeroSkill("knowledgeOfHumanNature"),
        persuading: zeroSkill("persuading"),
        convincing: zeroSkill("convincing"),
        bargaining: zeroSkill("bargaining"),
      },
      nature: {
        tracking: zeroSkill("tracking"),
        knottingSkills: zeroSkill("knottingSkills"),
        trapping: zeroSkill("trapping"),
        fishing: zeroSkill("fishing"),
        orientation: zeroSkill("orientation"),
        wildernessLife: zeroSkill("wildernessLife"),
      },
      knowledge: {
        anatomy: zeroSkill("anatomy"),
        architecture: zeroSkill("architecture"),
        geography: zeroSkill("geography"),
        history: zeroSkill("history"),
        petrology: zeroSkill("petrology"),
        botany: zeroSkill("botany"),
        philosophy: zeroSkill("philosophy"),
        astronomy: zeroSkill("astronomy"),
        mathematics: zeroSkill("mathematics"),
        knowledgeOfTheLaw: zeroSkill("knowledgeOfTheLaw"),
        estimating: zeroSkill("estimating"),
        zoology: zeroSkill("zoology"),
        technology: zeroSkill("technology"),
        chemistry: zeroSkill("chemistry"),
        warfare: zeroSkill("warfare"),
        itSkills: zeroSkill("itSkills"),
        mechanics: zeroSkill("mechanics"),
      },
      handcraft: {
        training: zeroSkill("training"),
        woodwork: zeroSkill("woodwork"),
        foodProcessing: zeroSkill("foodProcessing"),
        leatherProcessing: zeroSkill("leatherProcessing"),
        metalwork: zeroSkill("metalwork"),
        stonework: zeroSkill("stonework"),
        fabricProcessing: zeroSkill("fabricProcessing"),
        alcoholProduction: zeroSkill("alcoholProduction"),
        steeringVehicles: zeroSkill("steeringVehicles"),
        fineMechanics: zeroSkill("fineMechanics"),
        cheating: zeroSkill("cheating"),
        firstAid: zeroSkill("firstAid"),
        calmingSbDown: zeroSkill("calmingSbDown"),
        drawingAndPainting: zeroSkill("drawingAndPainting"),
        makingMusic: zeroSkill("makingMusic"),
        lockpicking: zeroSkill("lockpicking"),
      },
    },
    combat: {
      melee: {
        martialArts: zeroCombatStats(),
        barehanded: zeroCombatStats(),
        chainWeapons: zeroCombatStats(),
        daggers: zeroCombatStats(),
        slashingWeaponsSharp1h: zeroCombatStats(),
        slashingWeaponsBlunt1h: zeroCombatStats(),
        thrustingWeapons1h: zeroCombatStats(),
        slashingWeaponsSharp2h: zeroCombatStats(),
        slashingWeaponsBlunt2h: zeroCombatStats(),
        thrustingWeapons2h: zeroCombatStats(),
      },
      ranged: {
        missile: zeroCombatStats(),
        firearmSimple: zeroCombatStats(),
        firearmMedium: zeroCombatStats(),
        firearmComplex: zeroCombatStats(),
        heavyWeapons: zeroCombatStats(),
      },
    },
  };
}
