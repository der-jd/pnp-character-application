import { z } from "zod";
import { BaseValues, baseValueSchema } from "../character-schemas.js";
import { initialNewSchema, MAX_STRING_LENGTH_DEFAULT, userIdSchema } from "../general-schemas.js";
import { recordSchema } from "../history-schemas.js";

export const patchBaseValuePathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "base-value-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type PatchBaseValuePathParams = z.infer<typeof patchBaseValuePathParamsSchema>;

export const patchBaseValueRequestSchema = z
  .object({
    start: initialNewSchema.optional(),
    byLvlUp: initialNewSchema.optional(),
    mod: initialNewSchema.optional(),
  })
  .strict();

export type PatchBaseValueRequest = z.infer<typeof patchBaseValueRequestSchema>;

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

export const patchBaseValueResponseSchema = z
  .object({
    data: updateBaseValueResponseSchema,
    historyRecord: recordSchema,
  })
  .strict();

export type PatchBaseValueResponse = z.infer<typeof patchBaseValueResponseSchema>;

export const baseValuesUpdatableByLvlUp: (keyof BaseValues)[] = [
  "healthPoints",
  "armorLevel",
  "initiativeBaseValue",
  "luckPoints",
  "bonusActionsPerCombatRound",
  "legendaryActions",
];
