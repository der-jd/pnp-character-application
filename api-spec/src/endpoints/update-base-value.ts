import { z } from "zod";
import { BaseValues, baseValueSchema } from "../character-schemas.js";
import { initialNewSchema, MAX_STRING_LENGTH_DEFAULT, userIdSchema } from "../general-schemas.js";

export const updateBaseValuePathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "base-value-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type UpdateBaseValuePathParams = z.infer<typeof updateBaseValuePathParamsSchema>;

export const updateBaseValueRequestSchema = z
  .object({
    start: initialNewSchema.optional(),
    byLvlUp: initialNewSchema.optional(),
    mod: initialNewSchema.optional(),
  })
  .strict();

export type UpdateBaseValueRequest = z.infer<typeof updateBaseValueRequestSchema>;

export const updateBaseValueResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    baseValueName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    baseValue: z
      .object({
        old: baseValueSchema,
        new: baseValueSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateBaseValueResponse = z.infer<typeof updateBaseValueResponseSchema>;

export const baseValuesUpdatableByLvlUp: (keyof BaseValues)[] = [
  "healthPoints",
  "armorLevel",
  "initiativeBaseValue",
  "luckPoints",
  "bonusActionsPerCombatRound",
  "legendaryActions",
];
