import { z } from "zod";
import { initialNewSchema, initialIncreasedSchema, userIdSchema } from "../general-schemas.js";
import { calculationPointsChangeSchema, recordSchema } from "../history-schemas.js";

export const patchCalculationPointsPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type PatchCalculationPointsPathParams = z.infer<typeof patchCalculationPointsPathParamsSchema>;

export const patchCalculationPointsRequestSchema = z
  .object({
    adventurePoints: z
      .object({
        start: initialNewSchema.optional(),
        total: initialIncreasedSchema.optional(),
      })
      .strict()
      .optional(),
    attributePoints: z
      .object({
        start: initialNewSchema.optional(),
        total: initialIncreasedSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type PatchCalculationPointsRequest = z.infer<typeof patchCalculationPointsRequestSchema>;

export const updateCalculationPointsResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    calculationPoints: z
      .object({
        old: calculationPointsChangeSchema,
        new: calculationPointsChangeSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateCalculationPointsResponse = z.infer<typeof updateCalculationPointsResponseSchema>;

export const patchCalculationPointsHistoryRecordSchema = recordSchema.extend({
  data: z
    .object({
      old: calculationPointsChangeSchema,
      new: calculationPointsChangeSchema,
    })
    .strict(),
});

export type PatchCalculationPointsHistoryRecord = z.infer<typeof patchCalculationPointsHistoryRecordSchema>;

export const patchCalculationPointsResponseSchema = z
  .object({
    data: updateCalculationPointsResponseSchema,
    historyRecord: patchCalculationPointsHistoryRecordSchema.nullable(),
  })
  .strict();

export type PatchCalculationPointsResponse = z.infer<typeof patchCalculationPointsResponseSchema>;
