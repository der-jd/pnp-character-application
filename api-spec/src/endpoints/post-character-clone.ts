import { z } from "zod";
import { characterNameSchema, levelSchema } from "../character-schemas.js";
import { userIdSchema } from "../general-schemas.js";

export const postCharacterClonePathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type PostCharacterClonePathParams = z.infer<typeof postCharacterClonePathParamsSchema>;

export const postCharacterCloneRequestSchema = z
  .object({
    userIdOfCharacter: z.uuid(),
  })
  .strict();

export type PostCharacterCloneRequest = z.infer<typeof postCharacterCloneRequestSchema>;

export const postCharacterCloneResponseSchema = z
  .object({
    userId: userIdSchema,
    characterId: z.uuid(),
    name: characterNameSchema,
    level: levelSchema,
  })
  .strict();

export type PostCharacterCloneResponse = z.infer<typeof postCharacterCloneResponseSchema>;
