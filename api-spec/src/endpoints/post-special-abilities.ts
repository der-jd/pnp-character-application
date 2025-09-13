import { z } from "zod";
import { userIdSchema, MAX_ARRAY_SIZE } from "../general-schemas.js";
import { specialAbilitySchema } from "../character-schemas.js";
import { recordSchema, stringArraySchema } from "../history-schemas.js";

export const postSpecialAbilitiesPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type PostSpecialAbilitiesPathParams = z.infer<typeof postSpecialAbilitiesPathParamsSchema>;

export const postSpecialAbilitiesRequestSchema = z
  .object({
    specialAbility: specialAbilitySchema,
  })
  .strict();

export type PostSpecialAbilitiesRequest = z.infer<typeof postSpecialAbilitiesRequestSchema>;

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

export const postSpecialAbilitiesHistoryRecordSchema = recordSchema.extend({
  data: z
    .object({
      old: stringArraySchema,
      new: stringArraySchema,
    })
    .strict(),
});

export type PostSpecialAbilitiesHistoryRecord = z.infer<typeof postSpecialAbilitiesHistoryRecordSchema>;

export const postSpecialAbilitiesResponseSchema = z
  .object({
    data: addSpecialAbilityResponseSchema,
    historyRecord: postSpecialAbilitiesHistoryRecordSchema.nullable(),
  })
  .strict();

export type PostSpecialAbilitiesResponse = z.infer<typeof postSpecialAbilitiesResponseSchema>;
