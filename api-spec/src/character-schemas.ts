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

export enum AdvantagesNames {
  HIGH_SCHOOL_DEGREE,
  CHARMER,
  DARK_VISION,
  LUCKY,
  GOOD_LOOKING,
  GOOD_MEMORY,
  OUTSTANDING_SENSE_SIGHT_HEARING,
  MASTER_OF_THE_SITUATION,
  HIGH_GENERAL_KNOWLEDGE,
  MASTER_OF_IMPROVISATION,
  MILITARY_TRAINING,
  BRAVE,
  ATHLETIC,
  COLLEGE_EDUCATION,
  DARING,
  MELODIOUS_VOICE,
}

export enum DisadvantagesNames {
  SUPERSTITION,
  COWARD,
  LOW_GENERAL_KNOWLEDGE,
  SOCIALLY_INEPT,
  NO_DEGREE,
  PACIFIST,
  UNLUCKY,
  EARLY_SCHOOL_DROPOUT,
  FEAR_OF,
  MISER,
  SENSE_OF_JUSTICE,
  IMPULSIVE,
  HOT_TEMPERED,
  LETHARGIC,
  VENGEFUL,
  QUARRELSOME,
  SPEECH_IMPEDIMENT,
  SLEEP_DISORDER,
  SPENDTHRIFT,
  NIGHT_BLIND,
  BAD_HABIT,
  BAD_TRAIT,
  ADDICTION_CAFFEINE,
  ADDICTION_NICOTINE,
  ADDICTION_GAMBLING,
  ADDICTION_ALCOHOL,
  ADDICTION_DRUGS,
  IMPAIRED_SENSE,
  UNATTRACTIVE,
  UNPLEASANT_VOICE,
  POOR_MEMORY,
}

export const advantageSchema = z.tuple([
  z.enum(AdvantagesNames),
  z.string().max(MAX_STRING_LENGTH_DEFAULT),
  z.number().int().min(-99).max(99),
]);

export type Advantage = z.infer<typeof advantageSchema>;

export const advantagesSchema = z.array(advantageSchema).max(MAX_ARRAY_SIZE);

export type Advantages = z.infer<typeof advantagesSchema>;

export const disadvantageSchema = z.tuple([
  z.enum(DisadvantagesNames),
  z.string().max(MAX_STRING_LENGTH_DEFAULT),
  z.number().int().min(-99).max(99),
]);

export type Disadvantage = z.infer<typeof disadvantageSchema>;

export const disadvantagesSchema = z.array(disadvantageSchema).max(MAX_ARRAY_SIZE);

export type Disadvantages = z.infer<typeof disadvantagesSchema>;

export const ADVANTAGES: Advantages = [
  [AdvantagesNames.HIGH_SCHOOL_DEGREE, "", 3],
  [AdvantagesNames.CHARMER, "", 5],
  [AdvantagesNames.DARK_VISION, "", 2],
  [AdvantagesNames.LUCKY, "", 3],
  [AdvantagesNames.GOOD_LOOKING, "", 2],
  [AdvantagesNames.GOOD_MEMORY, "", 3],
  [AdvantagesNames.OUTSTANDING_SENSE_SIGHT_HEARING, "", 3],
  [AdvantagesNames.MASTER_OF_THE_SITUATION, "", 7],
  [AdvantagesNames.HIGH_GENERAL_KNOWLEDGE, "", 6],
  [AdvantagesNames.MASTER_OF_IMPROVISATION, "", 5],
  [AdvantagesNames.MILITARY_TRAINING, "", 8],
  [AdvantagesNames.BRAVE, "", 2],
  [AdvantagesNames.ATHLETIC, "", 4],
  [AdvantagesNames.COLLEGE_EDUCATION, "skillName", 5],
  [AdvantagesNames.DARING, "", 4],
  [AdvantagesNames.MELODIOUS_VOICE, "", 2],
];

export const DISADVANTAGES: Disadvantages = [
  [DisadvantagesNames.SUPERSTITION, "", 4],
  [DisadvantagesNames.COWARD, "", 4],
  [DisadvantagesNames.LOW_GENERAL_KNOWLEDGE, "", 6],
  [DisadvantagesNames.SOCIALLY_INEPT, "", 5],
  [DisadvantagesNames.NO_DEGREE, "", 3],
  [DisadvantagesNames.PACIFIST, "", 6],
  [DisadvantagesNames.UNLUCKY, "", 3],
  [DisadvantagesNames.EARLY_SCHOOL_DROPOUT, "", 7],
  [DisadvantagesNames.FEAR_OF, "something", 2],
  [DisadvantagesNames.FEAR_OF, "something", 5],
  [DisadvantagesNames.MISER, "", 3],
  [DisadvantagesNames.SENSE_OF_JUSTICE, "", 5],
  [DisadvantagesNames.IMPULSIVE, "", 3],
  [DisadvantagesNames.HOT_TEMPERED, "", 4],
  [DisadvantagesNames.LETHARGIC, "", 3],
  [DisadvantagesNames.VENGEFUL, "", 2],
  [DisadvantagesNames.QUARRELSOME, "", 5],
  [DisadvantagesNames.SPEECH_IMPEDIMENT, "", 1],
  [DisadvantagesNames.SLEEP_DISORDER, "", 3],
  [DisadvantagesNames.SPENDTHRIFT, "", 3],
  [DisadvantagesNames.NIGHT_BLIND, "", 2],
  [DisadvantagesNames.BAD_HABIT, "", 2],
  [DisadvantagesNames.BAD_TRAIT, "", 4],
  [DisadvantagesNames.ADDICTION_CAFFEINE, "", 2],
  [DisadvantagesNames.ADDICTION_NICOTINE, "", 3],
  [DisadvantagesNames.ADDICTION_GAMBLING, "", 3],
  [DisadvantagesNames.ADDICTION_ALCOHOL, "", 10],
  [DisadvantagesNames.ADDICTION_DRUGS, "", 10],
  [DisadvantagesNames.IMPAIRED_SENSE, "", 4],
  [DisadvantagesNames.UNATTRACTIVE, "", 2],
  [DisadvantagesNames.UNPLEASANT_VOICE, "", 2],
  [DisadvantagesNames.POOR_MEMORY, "", 3],
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
    // availablePoints = handling + change of corresponding-skill.current + change of corresponding-skill.mod
    availablePoints: z.number().int().min(0).max(MAX_POINTS),
    handling: z.number().int().min(MIN_COMBAT_VALUE).max(MAX_POINTS),
    // attackValue = skilledAttackValue + (ranged)attackBaseValue.current + (ranged)attackBaseValue.mod
    attackValue: z.number().int().min(MIN_COMBAT_VALUE).max(MAX_POINTS),
    skilledAttackValue: z.number().int().min(MIN_COMBAT_VALUE).max(MAX_POINTS),
    // paradeValue (only for melee combat) = skilledParadeValue + paradeBaseValue.current + paradeBaseValue.mod
    paradeValue: z.number().int().min(MIN_COMBAT_VALUE).max(MAX_POINTS),
    skilledParadeValue: z.number().int().min(MIN_COMBAT_VALUE).max(MAX_POINTS),
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

export type SkillCategory = keyof CharacterSheet["skills"];

type Join<K extends string, V extends string> = `${K}/${V}`;
export type SkillNameWithCategory = {
  [Category in keyof CharacterSheet["skills"]]: Join<
    Category & string,
    keyof CharacterSheet["skills"][Category] & string
  >;
}[keyof CharacterSheet["skills"]];

const combatSkillCategory: SkillCategory = "combat";

export const combatSkills = Object.keys(combatSkillsSchema.shape).map(
  (skill) => `${combatSkillCategory}/${skill}` as SkillNameWithCategory,
);

export const START_SKILLS: SkillNameWithCategory[] = [
  "body/athletics",
  "body/climbing",
  "body/bodyControl",
  "body/sneaking",
  "body/swimming",
  "body/selfControl",
  "body/hiding",
  "body/singing",
  "body/sharpnessOfSenses",
  "body/quaffing",
  "social/etiquette",
  "social/knowledgeOfHumanNature",
  "social/persuading",
  "social/bargaining",
  "nature/knottingSkills",
  "knowledge/mathematics",
  "knowledge/zoology",
  "handcraft/woodwork",
  "handcraft/foodProcessing",
  "handcraft/fabricProcessing",
  "handcraft/steeringVehicles",
  "handcraft/firstAid",
  "handcraft/calmingSbDown",
  "handcraft/drawingAndPainting",
  ...(Object.keys(combatSkillsSchema.shape) as Array<keyof CharacterSheet["skills"]["combat"]>).map(
    (skill) => `${combatSkillCategory}/${skill}` as SkillNameWithCategory,
  ),
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
    advantages: advantagesSchema,
    disadvantages: disadvantagesSchema,
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
            bargaining: skillSchema,
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

export const skillCategories = Object.keys(characterSheetSchema.shape.skills.shape) as SkillCategory[];
export const skillNames = Object.values(characterSheetSchema.shape.skills.shape).flatMap(
  (category) => category.keyof().options,
);
