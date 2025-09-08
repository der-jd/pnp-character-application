import { z } from "zod";
import { characterNameSchema, characterSchema, levelSchema } from "../character-schemas.js";
import { userIdSchema } from "../general-schemas.js";

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
    userId: userIdSchema,
    characterId: z.uuid(),
    name: characterNameSchema,
    level: levelSchema,
  })
  .strict();

export type CharacterShort = z.infer<typeof characterShortSchema>;

export const getCharactersResponseSchema = z
  .object({
    characters: z.array(z.union([characterSchema, characterShortSchema])),
  })
  .strict();

export type GetCharactersResponse = z.infer<typeof getCharactersResponseSchema>;
