import { z } from "zod";
import { userIdSchema } from "../general-schemas.js";

export const deleteCharacterPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type DeleteCharacterPathParams = z.infer<typeof deleteCharacterPathParamsSchema>;

export const deleteCharacterResponseSchema = z
  .object({
    userId: userIdSchema,
    characterId: z.uuid(),
  })
  .strict();

export type DeleteCharacterResponse = z.infer<typeof deleteCharacterResponseSchema>;
