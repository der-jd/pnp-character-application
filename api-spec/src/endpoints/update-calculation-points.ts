import { z } from "zod";
import { initialNewSchema, initialIncreasedSchema } from "../general-schemas.js";
import { calculationPointsSchema } from "../character-schemas.js";

export const updateCalculationPointsPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
  })
  .strict();

export type UpdateCalculationPointsPathParams = z.infer<typeof updateCalculationPointsPathParamsSchema>;

export const updateCalculationPointsRequestSchema = z
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

export type UpdateCalculationPointsRequest = z.infer<typeof updateCalculationPointsRequestSchema>;

export const updateCalculationPointsResponseSchema = z
  .object({
    characterId: z.string().uuid(),
    userId: z.string(),
    calculationPoints: z
      .object({
        old: z
          .object({
            adventurePoints: calculationPointsSchema.optional(),
            attributePoints: calculationPointsSchema.optional(),
          })
          .strict(),
        new: z
          .object({
            adventurePoints: calculationPointsSchema.optional(),
            attributePoints: calculationPointsSchema.optional(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type UpdateCalculationPointsResponse = z.infer<typeof updateCalculationPointsResponseSchema>;
