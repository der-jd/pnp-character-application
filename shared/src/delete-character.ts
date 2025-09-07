import { z } from "zod";

export const deleteCharacterPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
  })
  .strict();

export type DeleteCharacterPathParams = z.infer<typeof deleteCharacterPathParamsSchema>;

export const deleteCharacterResponseSchema = z
  .object({
    userId: z.string(),
    characterId: z.string().uuid(),
  })
  .strict();

export type DeleteCharacterResponse = z.infer<typeof deleteCharacterResponseSchema>;
