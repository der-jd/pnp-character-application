import { z } from "zod";
import { initialIncreasedSchema, MAX_STRING_LENGTH_DEFAULT, userIdSchema } from "../general-schemas.js";
import { combatValuesSchema } from "../character-schemas.js";
import { recordSchema } from "../history-schemas.js";

export const patchCombatValuesPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "combat-category": z.string().max(MAX_STRING_LENGTH_DEFAULT),
    "combat-skill-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type PatchCombatValuesPathParams = z.infer<typeof patchCombatValuesPathParamsSchema>;

export const patchCombatValuesRequestSchema = z
  .object({
    skilledAttackValue: initialIncreasedSchema,
    skilledParadeValue: initialIncreasedSchema,
  })
  .strict();

export type PatchCombatValuesRequest = z.infer<typeof patchCombatValuesRequestSchema>;

export const updateCombatValuesResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    combatCategory: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    combatSkillName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    combatValues: z
      .object({
        old: combatValuesSchema,
        new: combatValuesSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateCombatValuesResponse = z.infer<typeof updateCombatValuesResponseSchema>;

export const patchCombatValuesHistoryRecordSchema = recordSchema.extend({
  data: z
    .object({
      old: combatValuesSchema,
      new: combatValuesSchema,
    })
    .strict(),
});

export type PatchCombatValuesHistoryRecord = z.infer<typeof patchCombatValuesHistoryRecordSchema>;

export const patchCombatValuesResponseSchema = z
  .object({
    data: updateCombatValuesResponseSchema,
    historyRecord: patchCombatValuesHistoryRecordSchema.nullable(),
  })
  .strict();

export type PatchCombatValuesResponse = z.infer<typeof patchCombatValuesResponseSchema>;
