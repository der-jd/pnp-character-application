import { z } from "zod";
import { characterSchema } from "../character-schemas.js";

export const getCharacterPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type GetCharacterPathParams = z.infer<typeof getCharacterPathParamsSchema>;

export const getCharacterResponseSchema = characterSchema;

export type GetCharacterResponse = z.infer<typeof getCharacterResponseSchema>;
