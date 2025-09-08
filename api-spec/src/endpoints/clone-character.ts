import { z } from "zod";
import { levelSchema } from "../character-schemas.js";
import { userIdSchema } from "../general-schemas.js";

export const cloneCharacterPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type CloneCharacterPathParams = z.infer<typeof cloneCharacterPathParamsSchema>;

export const cloneCharacterRequestSchema = z
  .object({
    userIdOfCharacter: z.uuid(),
  })
  .strict();

export type CloneCharacterRequest = z.infer<typeof cloneCharacterRequestSchema>;

export const cloneCharacterResponseSchema = z
  .object({
    userId: userIdSchema,
    characterId: z.uuid(),
    name: z.string(),
    level: levelSchema,
  })
  .strict();

export type CloneCharacterResponse = z.infer<typeof cloneCharacterResponseSchema>;
