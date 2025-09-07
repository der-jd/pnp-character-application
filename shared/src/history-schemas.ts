import { z } from "zod";
import {
  attributeSchema,
  calculationPointsSchema,
  characterSheetSchema,
  combatValuesSchema,
  MAX_STRING_LENGTH_VERY_LONG,
  skillSchema,
} from "./character-schemas.js";

export enum RecordType {
  CHARACTER_CREATED = 0,
  LEVEL_CHANGED = 1,
  CALCULATION_POINTS_CHANGED = 2,
  BASE_VALUE_CHANGED = 3,
  SPECIAL_ABILITIES_CHANGED = 4,
  ATTRIBUTE_CHANGED = 5,
  SKILL_CHANGED = 6,
  COMBAT_VALUES_CHANGED = 7,
}

export function parseRecordType(method: string): RecordType {
  return RecordType[method.toUpperCase() as keyof typeof RecordType];
}

export const recordSchema = z
  .object({
    type: z.nativeEnum(RecordType),
    name: z.string(),
    number: z.number().int().positive(),
    id: z.string().uuid(),
    data: z
      .object({
        old: z.record(z.string(), z.unknown()),
        new: z.record(z.string(), z.unknown()),
      })
      .strict(),
    learningMethod: z.string().nullable(),
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
    timestamp: z.string().datetime(), // YYYY-MM-DDThh:mm:ssZ/±hh:mm, e.g. 2023-03-15T16:00:00Z (UTC) or 2023-03-15T16:00:00-07:00 (PDT)
  })
  .strict();

export type Record = z.infer<typeof recordSchema>;

export const historyBlockSchema = z
  .object({
    characterId: z.string().uuid(),
    blockNumber: z.number().int().positive(),
    blockId: z.string().uuid(),
    previousBlockId: z.string().uuid().nullable(),
    changes: z.array(recordSchema),
  })
  .strict();

export type HistoryBlock = z.infer<typeof historyBlockSchema>;

export const integerSchema = z
  .object({
    value: z.number().int(),
  })
  .strict();

export const stringArraySchema = z
  .object({
    values: z.array(z.string()),
  })
  .strict();

export const stringSetSchema = z
  .object({
    values: z.set(z.string()),
  })
  .strict();

export const attributeChangeSchema = z
  .object({
    attribute: attributeSchema,
    baseValues: characterSheetSchema.shape.baseValues.partial().optional(),
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
    combatValues: combatValuesSchema.optional(),
  })
  .strict();
