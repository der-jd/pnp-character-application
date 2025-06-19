import { z } from "zod";
import { RecordType } from "./history.js";
import {
  attributeSchema,
  calculationPointsSchema,
  characterSheetSchema,
  combatValuesSchema,
  skillSchema,
} from "./character_schema.js";

export const recordSchema = z
  .object({
    type: z.nativeEnum(RecordType),
    name: z.string(),
    number: z.number(),
    id: z.string(),
    data: z
      .object({
        old: z.record(z.any()),
        new: z.record(z.any()),
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
    comment: z.string().nullable(),
    timestamp: z.string().datetime(), // YYYY-MM-DDThh:mm:ssZ/±hh:mm, e.g. 2025-03-24T16:34:56Z (UTC) or 2025-03-24T16:34:56+02:00
  })
  .strict();

export type Record = z.infer<typeof recordSchema>;

export const historyBlockSchema = z
  .object({
    characterId: z.string(),
    blockNumber: z.number(),
    blockId: z.string(),
    previousBlockId: z.string().nullable(),
    changes: z.array(recordSchema),
  })
  .strict();

export type HistoryBlock = z.infer<typeof historyBlockSchema>;

export const numberSchema = z
  .object({
    value: z.number(),
  })
  .strict();

export const stringSchema = z
  .object({
    value: z.string(),
  })
  .strict();

export const attributeChangeSchema = z
  .object({
    attribute: attributeSchema,
    baseValues: characterSheetSchema.shape.baseValues.partial().optional(),
  })
  .strict();

export const skillChangeSchema = z
  .object({
    skill: skillSchema,
    combatValues: combatValuesSchema.optional(),
  })
  .strict();
