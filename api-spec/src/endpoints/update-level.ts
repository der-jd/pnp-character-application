import { z } from "zod";
import { userIdSchema } from "../general-schemas.js";
import { levelSchema } from "../character-schemas.js";

export const updateLevelPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type UpdateLevelPathParams = z.infer<typeof updateLevelPathParamsSchema>;

export const updateLevelRequestSchema = z
  .object({
    initialLevel: levelSchema,
  })
  .strict();

export type UpdateLevelRequest = z.infer<typeof updateLevelRequestSchema>;

export const updateLevelResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    level: z
      .object({
        old: z.object({ value: levelSchema }).strict(),
        new: z.object({ value: levelSchema }).strict(),
      })
      .strict(),
  })
  .strict();

export type UpdateLevelResponse = z.infer<typeof updateLevelResponseSchema>;
