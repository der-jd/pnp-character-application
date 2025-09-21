import { z } from "zod";
import {
  attributeSchema,
  baseValuesSchema,
  calculationPointsSchema,
  characterSchema,
  combatSectionSchema,
  combatStatsSchema,
  combinedSkillCategoryAndNameSchema,
  learningMethodSchema,
  levelSchema,
  skillSchema,
  specialAbilitySchema,
} from "./character-schemas.js";
import {
  MAX_STRING_LENGTH_DEFAULT,
  MAX_STRING_LENGTH_LONG,
  MAX_STRING_LENGTH_VERY_LONG,
  MAX_ARRAY_SIZE,
  MAX_POINTS,
  MIN_POINTS,
  MAX_HISTORY_RECORDS,
  MAX_HISTORY_BLOCK_NUMBER,
  MIN_HISTORY_BLOCK_NUMBER,
} from "./general-schemas.js";

export enum RecordType {
  CHARACTER_CREATED = 0,
  LEVEL_CHANGED = 1,
  CALCULATION_POINTS_CHANGED = 2,
  BASE_VALUE_CHANGED = 3,
  SPECIAL_ABILITIES_CHANGED = 4,
  ATTRIBUTE_CHANGED = 5,
  SKILL_CHANGED = 6,
  COMBAT_STATS_CHANGED = 7,
}

export const recordSchema = z
  .object({
    type: z.enum(RecordType),
    name: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    number: z.number().int().min(1).max(MAX_HISTORY_RECORDS),
    id: z.uuid(),
    data: z
      .object({
        old: z.record(z.string().max(MAX_STRING_LENGTH_DEFAULT), z.unknown()).optional(),
        new: z.record(z.string().max(MAX_STRING_LENGTH_DEFAULT), z.unknown()),
      })
      .strict(),
    learningMethod: learningMethodSchema.nullable(),
    calculationPoints: z
      .object({
        adventurePoints: z
          .object({
            old: calculationPointsSchema,
            new: calculationPointsSchema,
          })
          .strict()
          .nullable(),
        attributePoints: z
          .object({
            old: calculationPointsSchema,
            new: calculationPointsSchema,
          })
          .strict()
          .nullable(),
      })
      .strict(),
    comment: z.string().max(MAX_STRING_LENGTH_VERY_LONG).nullable(),
    timestamp: z.iso.datetime(), // YYYY-MM-DDThh:mm:ssZ/±hh:mm, e.g. 2023-03-15T16:00:00Z (UTC) or 2023-03-15T16:00:00-07:00 (PDT)
  })
  .strict();

export type Record = z.infer<typeof recordSchema>;

export const historyBlockSchema = z
  .object({
    characterId: z.uuid(),
    blockNumber: z.number().int().min(MIN_HISTORY_BLOCK_NUMBER).max(MAX_HISTORY_BLOCK_NUMBER),
    blockId: z.uuid(),
    previousBlockId: z.uuid().nullable(),
    /**
     * No max array size is actually needed as the Lambda function to
     * add history records already limits the maximum size of a history block.
     * Nevertheless, the max array size is an additional safety measure here.
     */
    changes: z.array(recordSchema).max(MAX_ARRAY_SIZE),
  })
  .strict();

export type HistoryBlock = z.infer<typeof historyBlockSchema>;

export const NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION = 5;

export const activatedSkillsSchema = z
  .array(combinedSkillCategoryAndNameSchema)
  .length(NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION);

export type ActivatedSkills = z.infer<typeof activatedSkillsSchema>;

export const characterCreationSchema = z
  .object({
    character: characterSchema,
    generationPoints: z
      .object({
        throughDisadvantages: z.number().int().min(0).max(MAX_POINTS),
        spent: z.number().int().min(0).max(MAX_POINTS),
        total: z.number().int().min(0).max(MAX_POINTS),
      })
      .strict(),
    activatedSkills: activatedSkillsSchema,
  })
  .strict();

export type CharacterCreation = z.infer<typeof characterCreationSchema>;

export const integerSchema = z
  .object({
    value: z.number().int().min(MIN_POINTS).max(MAX_POINTS),
  })
  .strict();

export const stringArraySchema = z
  .object({
    values: z.array(z.string().max(MAX_STRING_LENGTH_LONG)).max(MAX_ARRAY_SIZE),
  })
  .strict();

export const levelChangeSchema = z
  .object({
    value: levelSchema,
  })
  .strict();

export const specialAbilitiesChangeSchema = z
  .object({
    values: z.array(specialAbilitySchema).max(MAX_ARRAY_SIZE),
  })
  .strict();

export const attributeChangeSchema = z
  .object({
    attribute: attributeSchema,
    baseValues: baseValuesSchema.partial().optional(),
    combat: combatSectionSchema.partial().optional(),
  })
  .strict();

export const calculationPointsChangeSchema = z
  .object({
    adventurePoints: calculationPointsSchema.optional(),
    attributePoints: calculationPointsSchema.optional(),
  })
  .strict();

export const skillChangeSchema = z
  .object({
    skill: skillSchema,
    combatStats: combatStatsSchema.optional(),
  })
  .strict();
