import { z } from "zod";
import {
  MAX_STRING_LENGTH_DEFAULT,
  MAX_STRING_LENGTH_LONG,
  MAX_STRING_LENGTH_SHORT,
  MAX_STRING_LENGTH_VERY_LONG,
  MAX_POINTS,
  MAX_COST,
  MAX_ARRAY_SIZE,
  MIN_LEVEL,
  MAX_LEVEL,
  MAX_ATTRIBUTE_VALUE,
  MIN_ATTRIBUTE_VALUE,
  userIdSchema,
  MIN_BASE_VALUE,
  MIN_COMBAT_VALUE,
  MIN_POINTS,
} from "./general-schemas.js";

export const combinedSkillCategoryAndNameSchema = z
  .string()
  .regex(new RegExp(`^[^/]{1,${MAX_STRING_LENGTH_DEFAULT}}/[^/]{1,${MAX_STRING_LENGTH_DEFAULT}}$`), {
    message: `Skill must be in the format "skillCategory/skillName", each max ${MAX_STRING_LENGTH_DEFAULT} characters.`,
  });

export const professionHobbySchema = z
  .object({
    name: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    skill: combinedSkillCategoryAndNameSchema,
  })
  .strict();

export type ProfessionHobby = z.infer<typeof professionHobbySchema>;

export const levelSchema = z.number().int().min(MIN_LEVEL).max(MAX_LEVEL);

export type Level = z.infer<typeof levelSchema>;

export const characterNameSchema = z.string().max(MAX_STRING_LENGTH_DEFAULT);

export const generalInformationSchema = z
  .object({
    name: characterNameSchema,
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
    start: z.number().min(0).max(MAX_POINTS),
    available: z.number().min(0).max(MAX_POINTS),
    total: z.number().min(0).max(MAX_POINTS),
  })
  .strict();

export type CalculationPoints = z.infer<typeof calculationPointsSchema>;

export const dis_advantageSchema = z.tuple([
    z.string().max(MAX_STRING_LENGTH_DEFAULT),
    z.number().int().min(-99).max(99),
  ]);

export type DisAdvantage = z.infer<typeof dis_advantageSchema>;

export const dis_advantagesSchema = z.array(dis_advantageSchema).max(MAX_ARRAY_SIZE);

export type DisAdvantages = z.infer<typeof dis_advantagesSchema>;

export const ADVANTAGES: DisAdvantages = [
  ["High School Degree", 3],
  ["Charmer", 5],
  ["Dark Vision", 2],
  ["Lucky", 3],
  ["Good-Looking", 2],
  ["Good Memory", 3],
  ["Outstanding Sense [Sight/Hearing]", 3],
  ["Master of the Situation", 7],
  ["High General Knowledge", 6],
  ["Master of Improvisation", 5],
  ["Military Training", 8],
  ["Brave", 2],
  ["Athletic", 4],
  ["College Education", 5],
  ["Daring", 4],
  ["Melodious Voice", 2],
];

export const DISADVANTAGES: DisAdvantages = [
  ["Superstition", 4],
  ["Coward", 4],
  ["Low General Knowledge", 6],
  ["Socially Inept", 5],
  ["No Degree", 3],
  ["Pacifist", 6],
  ["Unlucky", 3],
  ["Early School Dropout", 7],
  ["Fear of ...", 2],
  ["Fear of ...", 3],
  ["Fear of ...", 4],
  ["Fear of ...", 5],
  ["Miser", 3],
  ["Sense of Justice", 5],
  ["Impulsive", 3],
  ["Hot-Tempered", 4],
  ["Lethargic", 3],
  ["Vengeful", 2],
  ["Quarrelsome", 5],
  ["Speech Impediment", 1],
  ["Sleep Disorder", 3],
  ["Spendthrift", 3],
  ["Night Blind", 2],
  ["Bad Habit", 2],
  ["Bad Trait", 4],
  ["Addiction (Caffeine)", 2],
  ["Addiction (Nicotine)", 3],
  ["Addiction (Gambling)", 3],
  ["Addiction (Alcohol)", 10],
  ["Addiction (Drugs)", 10],
  ["Impaired Sense", 4],
  ["Unattractive", 2],
  ["Unpleasant Voice", 2],
  ["Poor Memory", 3],
];

export const attributeSchema = z
  .object({
    start: z.number().int().min(MIN_ATTRIBUTE_VALUE).max(MAX_ATTRIBUTE_VALUE),
    current: z.number().int().min(MIN_ATTRIBUTE_VALUE).max(MAX_ATTRIBUTE_VALUE),
    mod: z.number().int().min(MIN_ATTRIBUTE_VALUE).max(MAX_ATTRIBUTE_VALUE),
    totalCost: z.number().int().min(0).max(MAX_COST),
  })
  .strict();

export type Attribute = z.infer<typeof attributeSchema>;

export const attributesSchema = z
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
  .strict();

export type Attributes = z.infer<typeof attributesSchema>;

export const baseValueSchema = z
  .object({
    start: z.number().int().min(MIN_BASE_VALUE).max(MAX_POINTS),
    current: z.number().int().min(MIN_BASE_VALUE).max(MAX_POINTS), // byFormula + byLvlUp + increased (not implemented atm)
    byFormula: z.number().int().min(0).max(MAX_POINTS).optional(), // Some base values are not changed by a formula
    byLvlUp: z.number().int().min(0).max(MAX_POINTS).optional(), // Some base values can't be changed by level up
    mod: z.number().int().min(MIN_BASE_VALUE).max(MAX_POINTS),
    //totalCost: z.number()...optional(); // No base value can be increased by points atm
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
    availablePoints: z.number().int().min(0).max(MAX_POINTS),
    attackValue: z.number().int().min(MIN_COMBAT_VALUE).max(MAX_POINTS),
    paradeValue: z.number().int().min(MIN_COMBAT_VALUE).max(MAX_POINTS),
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
    start: z.number().int().min(MIN_POINTS).max(MAX_POINTS),
    current: z.number().int().min(MIN_POINTS).max(MAX_POINTS),
    mod: z.number().int().min(MIN_POINTS).max(MAX_POINTS),
    totalCost: z.number().min(0).max(MAX_COST),
    defaultCostCategory: z.enum(CostCategory),
  })
  .strict();

export type Skill = z.infer<typeof skillSchema>;

export const combatSkillsSchema = z
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
  .strict();

export type CombatSkills = z.infer<typeof combatSkillsSchema>;

export type CombatSkillName = keyof CombatSkills;
export type BodySkillName = keyof CharacterSheet["skills"]["body"];
export type SocialSkillName = keyof CharacterSheet["skills"]["social"];
export type NatureSkillName = keyof CharacterSheet["skills"]["nature"];
export type KnowledgeSkillName = keyof CharacterSheet["skills"]["knowledge"];
export type HandcraftSkillName = keyof CharacterSheet["skills"]["handcraft"];

export type SkillName =
  | CombatSkillName
  | BodySkillName
  | SocialSkillName
  | NatureSkillName
  | KnowledgeSkillName
  | HandcraftSkillName;

export const combatSkills = Object.keys(combatSkillsSchema) as SkillName[];

export const START_SKILLS: SkillName[] = [
  // body skills
  "athletics",
  "climbing",
  "bodyControl",
  "sneaking",
  "swimming",
  "selfControl",
  "hiding",
  "singing",
  "sharpnessOfSenses",
  "quaffing",
  // social skills
  "etiquette",
  "knowledgeOfHumanNature",
  "persuading",
  // nature skills
  "knottingSkills",
  // knowledge skills
  "mathematics",
  "zoology",
  // handcraft skills
  "woodwork",
  "foodProcessing",
  "fabricProcessing",
  "steeringVehicles",
  "bargaining",
  "firstAid",
  "calmingSbDown",
  "drawingAndPainting",
  ...combatSkills,
];

export const specialAbilitySchema = z.string().max(MAX_STRING_LENGTH_DEFAULT);

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
    /**
     * Duplicated special abilities are not allowed although
     * the type is an array instead of a Set.
     * Using a Set (unique values) leads to diverse complications
     * because JSON.stringify() can't handle Sets.
     */
    specialAbilities: z.array(specialAbilitySchema).max(MAX_ARRAY_SIZE),
    baseValues: baseValuesSchema,
    attributes: attributesSchema,
    skills: z
      .object({
        combat: combatSkillsSchema,
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
    userId: userIdSchema,
    characterId: z.uuid(),
    characterSheet: characterSheetSchema,
  })
  .strict();

export type Character = z.infer<typeof characterSchema>;
