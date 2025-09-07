import { z } from "zod";

export const START_LEVEL = 1;
export const MAX_STRING_LENGTH_SHORT = 30;
export const MAX_STRING_LENGTH_DEFAULT = 120;
export const MAX_STRING_LENGTH_LONG = 500;
export const MAX_STRING_LENGTH_VERY_LONG = 1000;

export const professionHobbySchema = z
  .object({
    name: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    skill: z.string().regex(new RegExp(`^[^/]{1,${MAX_STRING_LENGTH_DEFAULT}}/[^/]{1,${MAX_STRING_LENGTH_DEFAULT}}$`), {
      message: `Skill must be in the format "skillCategory/skillName", each max ${MAX_STRING_LENGTH_DEFAULT} characters.`,
    }),
  })
  .strict();

export type ProfessionHobby = z.infer<typeof professionHobbySchema>;

export const levelSchema = z.number().int().min(START_LEVEL);

export type Level = z.infer<typeof levelSchema>;

export const generalInformationSchema = z
  .object({
    name: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    level: levelSchema,
    sex: z.string().max(MAX_STRING_LENGTH_SHORT),
    profession: professionHobbySchema,
    hobby: professionHobbySchema,
    birthday: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    birthplace: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    size: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    weight: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    hairColor: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    eyeColor: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    residence: z.string().max(MAX_STRING_LENGTH_LONG),
    appearance: z.string().max(MAX_STRING_LENGTH_VERY_LONG),
    specialCharacteristics: z.string().max(MAX_STRING_LENGTH_VERY_LONG),
  })
  .strict();

export type GeneralInformation = z.infer<typeof generalInformationSchema>;

export const calculationPointsSchema = z
  .object({
    start: z.number(),
    available: z.number(),
    total: z.number(),
  })
  .strict();

export type CalculationPoints = z.infer<typeof calculationPointsSchema>;

export const dis_advantagesSchema = z.array(z.string().max(MAX_STRING_LENGTH_DEFAULT));

export const attributeSchema = z
  .object({
    start: z.number().int(),
    current: z.number().int(),
    mod: z.number().int(),
    totalCost: z.number().int(),
  })
  .strict();

export type Attribute = z.infer<typeof attributeSchema>;

export const baseValueSchema = z
  .object({
    start: z.number().int(),
    current: z.number().int(),
    byFormula: z.number().int().optional(),
    byLvlUp: z.number().int().optional(),
    mod: z.number().int(),
  })
  .strict();

export type BaseValue = z.infer<typeof baseValueSchema>;

export const baseValuesSchema = z
  .object({
    healthPoints: baseValueSchema,
    mentalHealth: baseValueSchema,
    armorLevel: baseValueSchema,
    naturalArmor: baseValueSchema,
    initiativeBaseValue: baseValueSchema,
    attackBaseValue: baseValueSchema,
    paradeBaseValue: baseValueSchema,
    rangedAttackBaseValue: baseValueSchema,
    luckPoints: baseValueSchema,
    bonusActionsPerCombatRound: baseValueSchema,
    legendaryActions: baseValueSchema,
  })
  .strict();

export type BaseValues = z.infer<typeof baseValuesSchema>;

export const combatValuesSchema = z
  .object({
    availablePoints: z.number().int(),
    attackValue: z.number().int(),
    paradeValue: z.number().int(),
  })
  .strict();

export type CombatValues = z.infer<typeof combatValuesSchema>;

export const learningMethodSchema = z.enum(["FREE", "LOW_PRICED", "NORMAL", "EXPENSIVE"]);

export type LearningMethodString = z.infer<typeof learningMethodSchema>;

export enum LearningMethod {
  FREE = 99, // Cost Category 0
  LOW_PRICED = -1, // Cost Category -1
  NORMAL = 0, // Default Cost Category
  EXPENSIVE = 1, // Cost Category +1
}

/**
 * The number values of CostCategory are used for the character sheet, not the string values "CAT_X".
 * Using the string values leads to multiple cumbersome problems and workarounds when trying to use
 * schemas with zod.
 */
export enum CostCategory {
  CAT_0 = 0,
  CAT_1 = 1,
  CAT_2 = 2,
  CAT_3 = 3,
  CAT_4 = 4,
}

export const skillSchema = z
  .object({
    activated: z.boolean(),
    start: z.number().int(),
    current: z.number().int(),
    mod: z.number().int(),
    totalCost: z.number(),
    defaultCostCategory: z.nativeEnum(CostCategory),
  })
  .strict();

export type Skill = z.infer<typeof skillSchema>;

export const characterSheetSchema = z
  .object({
    generalInformation: generalInformationSchema,
    calculationPoints: z
      .object({
        adventurePoints: calculationPointsSchema,
        attributePoints: calculationPointsSchema,
      })
      .strict(),
    advantages: dis_advantagesSchema,
    disadvantages: dis_advantagesSchema,
    specialAbilities: z.set(z.string().max(MAX_STRING_LENGTH_DEFAULT)),
    baseValues: baseValuesSchema,
    attributes: z
      .object({
        courage: attributeSchema,
        intelligence: attributeSchema,
        concentration: attributeSchema,
        charisma: attributeSchema,
        mentalResilience: attributeSchema,
        dexterity: attributeSchema,
        endurance: attributeSchema,
        strength: attributeSchema,
      })
      .strict(),
    skills: z
      .object({
        combat: z
          .object({
            martialArts: skillSchema,
            barehanded: skillSchema,
            chainWeapons: skillSchema,
            daggers: skillSchema,
            slashingWeaponsSharp1h: skillSchema,
            slashingWeaponsBlunt1h: skillSchema,
            thrustingWeapons1h: skillSchema,
            slashingWeaponsSharp2h: skillSchema,
            slashingWeaponsBlunt2h: skillSchema,
            thrustingWeapons2h: skillSchema,
            missile: skillSchema,
            firearmSimple: skillSchema,
            firearmMedium: skillSchema,
            firearmComplex: skillSchema,
            heavyWeapons: skillSchema,
          })
          .strict(),
        body: z
          .object({
            athletics: skillSchema,
            juggleries: skillSchema,
            climbing: skillSchema,
            bodyControl: skillSchema,
            riding: skillSchema,
            sneaking: skillSchema,
            swimming: skillSchema,
            selfControl: skillSchema,
            hiding: skillSchema,
            singing: skillSchema,
            sharpnessOfSenses: skillSchema,
            dancing: skillSchema,
            quaffing: skillSchema,
            pickpocketing: skillSchema,
          })
          .strict(),
        social: z
          .object({
            seduction: skillSchema,
            etiquette: skillSchema,
            teaching: skillSchema,
            acting: skillSchema,
            writtenExpression: skillSchema,
            streetKnowledge: skillSchema,
            knowledgeOfHumanNature: skillSchema,
            persuading: skillSchema,
            convincing: skillSchema,
          })
          .strict(),
        nature: z
          .object({
            tracking: skillSchema,
            knottingSkills: skillSchema,
            trapping: skillSchema,
            fishing: skillSchema,
            orientation: skillSchema,
            wildernessLife: skillSchema,
          })
          .strict(),
        knowledge: z
          .object({
            anatomy: skillSchema,
            architecture: skillSchema,
            geography: skillSchema,
            history: skillSchema,
            petrology: skillSchema,
            botany: skillSchema,
            philosophy: skillSchema,
            astronomy: skillSchema,
            mathematics: skillSchema,
            knowledgeOfTheLaw: skillSchema,
            estimating: skillSchema,
            zoology: skillSchema,
            technology: skillSchema,
            chemistry: skillSchema,
            warfare: skillSchema,
            itSkills: skillSchema,
            mechanics: skillSchema,
          })
          .strict(),
        handcraft: z
          .object({
            training: skillSchema,
            woodwork: skillSchema,
            foodProcessing: skillSchema,
            leatherProcessing: skillSchema,
            metalwork: skillSchema,
            stonework: skillSchema,
            fabricProcessing: skillSchema,
            alcoholProduction: skillSchema,
            steeringVehicles: skillSchema,
            fineMechanics: skillSchema,
            cheating: skillSchema,
            bargaining: skillSchema,
            firstAid: skillSchema,
            calmingSbDown: skillSchema,
            drawingAndPainting: skillSchema,
            makingMusic: skillSchema,
            lockpicking: skillSchema,
          })
          .strict(),
      })
      .strict(),
    combatValues: z
      .object({
        melee: z
          .object({
            martialArts: combatValuesSchema,
            barehanded: combatValuesSchema,
            chainWeapons: combatValuesSchema,
            daggers: combatValuesSchema,
            slashingWeaponsSharp1h: combatValuesSchema,
            slashingWeaponsBlunt1h: combatValuesSchema,
            thrustingWeapons1h: combatValuesSchema,
            slashingWeaponsSharp2h: combatValuesSchema,
            slashingWeaponsBlunt2h: combatValuesSchema,
            thrustingWeapons2h: combatValuesSchema,
          })
          .strict(),
        ranged: z
          .object({
            missile: combatValuesSchema,
            firearmSimple: combatValuesSchema,
            firearmMedium: combatValuesSchema,
            firearmComplex: combatValuesSchema,
            heavyWeapons: combatValuesSchema,
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type CharacterSheet = z.infer<typeof characterSheetSchema>;

export const characterSchema = z
  .object({
    userId: z.string(),
    characterId: z.string(),
    characterSheet: characterSheetSchema,
  })
  .strict();

export type Character = z.infer<typeof characterSchema>;
