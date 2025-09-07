import { z } from "zod";
import { characterSchema } from "./character-schemas.js";

export const getCharactersQueryParamsSchema = z
  .object({
    "character-short": z
      .string()
      .optional()
      .transform((val) => val === "true"),
  })
  .strict();

export type GetCharactersQueryParams = z.infer<typeof getCharactersQueryParamsSchema>;

export const characterShortSchema = z
  .object({
    userId: z.string(),
    characterId: z.string().uuid(),
    name: z.string(),
    level: z.number().int().min(1),
  })
  .strict();

export type CharacterShort = z.infer<typeof characterShortSchema>;

export const getCharactersResponseSchema = z
  .object({
    characters: z.array(z.union([characterSchema, characterShortSchema])),
  })
  .strict();

export type GetCharactersResponse = z.infer<typeof getCharactersResponseSchema>;
