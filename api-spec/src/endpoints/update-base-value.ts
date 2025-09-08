import { z } from "zod";
import { BaseValues, baseValueSchema } from "../character-schemas.js";
import { initialNewSchema, userIdSchema } from "../general-schemas.js";

export const updateBaseValuePathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
    "base-value-name": z.string(),
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
    characterId: z.string().uuid(),
    userId: userIdSchema,
    baseValueName: z.string(),
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
