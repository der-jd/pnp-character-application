import { z } from "zod";
import { START_LEVEL } from "../character-schemas.js";
import { userIdSchema } from "../general-schemas.js";

export const updateLevelPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type UpdateLevelPathParams = z.infer<typeof updateLevelPathParamsSchema>;

export const updateLevelRequestSchema = z
  .object({
    initialLevel: z.number().int().min(START_LEVEL),
  })
  .strict();

export type UpdateLevelRequest = z.infer<typeof updateLevelRequestSchema>;

export const updateLevelResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    level: z
      .object({
        old: z.object({ value: z.number().int().min(START_LEVEL) }).strict(),
        new: z.object({ value: z.number().int().positive() }).strict(),
      })
      .strict(),
  })
  .strict();

export type UpdateLevelResponse = z.infer<typeof updateLevelResponseSchema>;
