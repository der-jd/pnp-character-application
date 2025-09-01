import { z } from "zod";

export const updateLevelPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type UpdateLevelPathParams = z.infer<typeof updateLevelPathParamsSchema>;

export const updateLevelRequestSchema = z
  .object({
    initialLevel: z.number().int(),
  })
  .strict();

export type UpdateLevelRequest = z.infer<typeof updateLevelRequestSchema>;

export const updateLevelResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: z.uuid(),
    level: z
      .object({
        old: z.object({ value: z.number().int() }).strict(),
        new: z.object({ value: z.number().int() }).strict(),
      })
      .strict(),
  })
  .strict();

export type UpdateLevelResponse = z.infer<typeof updateLevelResponseSchema>;
