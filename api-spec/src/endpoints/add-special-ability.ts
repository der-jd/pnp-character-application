import { z } from "zod";
import { userIdSchema, MAX_ARRAY_SIZE } from "../general-schemas.js";
import { specialAbilitySchema } from "../character-schemas.js";

export const addSpecialAbilityPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type AddSpecialAbilityPathParams = z.infer<typeof addSpecialAbilityPathParamsSchema>;

export const addSpecialAbilityRequestSchema = z
  .object({
    specialAbility: specialAbilitySchema,
  })
  .strict();

export type AddSpecialAbilityRequest = z.infer<typeof addSpecialAbilityRequestSchema>;

export const addSpecialAbilityResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    specialAbilityName: specialAbilitySchema,
    specialAbilities: z
      .object({
        old: z
          .object({
            values: z.array(specialAbilitySchema).max(MAX_ARRAY_SIZE),
          })
          .strict(),
        new: z
          .object({
            values: z.array(specialAbilitySchema).max(MAX_ARRAY_SIZE),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type AddSpecialAbilityResponse = z.infer<typeof addSpecialAbilityResponseSchema>;
