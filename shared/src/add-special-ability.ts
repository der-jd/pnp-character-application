import { z } from "zod";
import { MAX_STRING_LENGTH_DEFAULT } from "./character-schemas.js";

export const addSpecialAbilityPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
  })
  .strict();

export type AddSpecialAbilityPathParams = z.infer<typeof addSpecialAbilityPathParamsSchema>;

export const addSpecialAbilityRequestSchema = z
  .object({
    specialAbility: z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type AddSpecialAbilityRequest = z.infer<typeof addSpecialAbilityRequestSchema>;

export const addSpecialAbilityResponseSchema = z
  .object({
    characterId: z.string().uuid(),
    userId: z.string(),
    specialAbilityName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    specialAbilities: z.object({
      old: z.object({
        values: z.array(z.string()),
      }),
      new: z.object({
        values: z.array(z.string()),
      }),
    }),
  })
  .strict();

export type AddSpecialAbilityResponse = z.infer<typeof addSpecialAbilityResponseSchema>;
