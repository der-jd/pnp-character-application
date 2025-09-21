import { z } from "zod";
import {
  attributeSchema,
  calculationPointsSchema,
  baseValuesSchema,
  combatSectionSchema,
} from "../character-schemas.js";
import {
  initialIncreasedSchema,
  initialNewSchema,
  MAX_STRING_LENGTH_DEFAULT,
  userIdSchema,
} from "../general-schemas.js";
import { attributeChangeSchema, recordSchema } from "../history-schemas.js";

export const patchAttributePathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "attribute-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type PatchAttributePathParams = z.infer<typeof patchAttributePathParamsSchema>;

export const patchAttributeRequestSchema = z
  .object({
    start: initialNewSchema.optional(),
    current: initialIncreasedSchema.optional(),
    mod: initialNewSchema.optional(),
  })
  .strict();

export type PatchAttributeRequest = z.infer<typeof patchAttributeRequestSchema>;

export const updateAttributeResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    attributeName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    changes: z
      .object({
        old: z
          .object({
            attribute: attributeSchema,
            baseValues: baseValuesSchema.partial().optional(),
            combat: combatSectionSchema.partial().optional(),
          })
          .strict(),
        new: z
          .object({
            attribute: attributeSchema,
            baseValues: baseValuesSchema.partial().optional(),
            combat: combatSectionSchema.partial().optional(),
          })
          .strict(),
      })
      .strict(),
    attributePoints: z
      .object({
        old: calculationPointsSchema,
        new: calculationPointsSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateAttributeResponse = z.infer<typeof updateAttributeResponseSchema>;

export const patchAttributeHistoryRecordSchema = recordSchema.extend({
  data: z
    .object({
      old: attributeChangeSchema,
      new: attributeChangeSchema,
    })
    .strict(),
});

export type PatchAttributeHistoryRecord = z.infer<typeof patchAttributeHistoryRecordSchema>;

export const patchAttributeResponseSchema = z
  .object({
    data: updateAttributeResponseSchema,
    historyRecord: patchAttributeHistoryRecordSchema.nullable(),
  })
  .strict();

export type PatchAttributeResponse = z.infer<typeof patchAttributeResponseSchema>;
