import { z } from "zod";
import { MAX_STRING_LENGTH_DEFAULT, START_LEVEL } from "./character-schemas.js";

export const cloneCharacterPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
  })
  .strict();

export type CloneCharacterPathParams = z.infer<typeof cloneCharacterPathParamsSchema>;

export const cloneCharacterRequestSchema = z
  .object({
    userIdOfCharacter: z.string().uuid(),
  })
  .strict();

export type CloneCharacterRequest = z.infer<typeof cloneCharacterRequestSchema>;

export const cloneCharacterResponseSchema = z
  .object({
    userId: z.string(),
    characterId: z.string().uuid(),
    name: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    level: z.number().int().min(START_LEVEL),
  })
  .strict();

export type CloneCharacterResponse = z.infer<typeof cloneCharacterResponseSchema>;
