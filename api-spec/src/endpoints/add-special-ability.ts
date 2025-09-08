import { z } from "zod";
import { MAX_STRING_LENGTH_DEFAULT } from "../character-schemas.js";
import { userIdSchema } from "../general-schemas.js";

export const addSpecialAbilityPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
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
    characterId: z.uuid(),
    userId: userIdSchema,
    specialAbilityName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    specialAbilities: z
      .object({
        old: z
          .object({
            values: z.array(z.string()),
          })
          .strict(),
        new: z
          .object({
            values: z.array(z.string()),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type AddSpecialAbilityResponse = z.infer<typeof addSpecialAbilityResponseSchema>;
