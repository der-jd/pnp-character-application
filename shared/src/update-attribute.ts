import { z } from "zod";
import { attributeSchema, calculationPointsSchema, baseValuesSchema } from "./character-schemas.js";

export const updateAttributePathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
    "attribute-name": z.string(),
  })
  .strict();

export type UpdateAttributePathParams = z.infer<typeof updateAttributePathParamsSchema>;

const initialNewSchema = z
  .object({
    initialValue: z.number().int(),
    newValue: z.number().int(),
  })
  .strict();

export type InitialNew = z.infer<typeof initialNewSchema>;

const initialIncreasedSchema = z
  .object({
    initialValue: z.number().int(),
    increasedPoints: z.number().int(),
  })
  .strict();

export type InitialIncreased = z.infer<typeof initialIncreasedSchema>;

export const updateAttributeRequestSchema = z
  .object({
    start: initialNewSchema.optional(),
    current: initialIncreasedSchema.optional(),
    mod: initialNewSchema.optional(),
  })
  .strict();

export type UpdateAttributeRequest = z.infer<typeof updateAttributeRequestSchema>;

export const updateAttributeResponseSchema = z.object({
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
});

export type UpdateAttributeResponse = z.infer<typeof updateAttributeResponseSchema>;
