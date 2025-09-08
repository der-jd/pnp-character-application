import { z } from "zod";
import { attributeSchema, calculationPointsSchema, baseValuesSchema } from "./character-schemas.js";
import { initialIncreasedSchema, initialNewSchema } from "./general-schemas.js";

export const updateAttributePathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
    "attribute-name": z.string(),
  })
  .strict();

export type UpdateAttributePathParams = z.infer<typeof updateAttributePathParamsSchema>;

export const updateAttributeRequestSchema = z
  .object({
    start: initialNewSchema.optional(),
    current: initialIncreasedSchema.optional(),
    mod: initialNewSchema.optional(),
  })
  .strict();

export type UpdateAttributeRequest = z.infer<typeof updateAttributeRequestSchema>;

export const updateAttributeResponseSchema = z
  .object({
    characterId: z.string().uuid(),
    userId: z.string(),
    attributeName: z.string(),
    changes: z
      .object({
        old: z
          .object({
            attribute: attributeSchema,
            baseValues: baseValuesSchema.partial().optional(),
          })
          .strict(),
        new: z
          .object({
            attribute: attributeSchema,
            baseValues: baseValuesSchema.partial().optional(),
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
