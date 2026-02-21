import { z } from "zod";
import { initialIncreasedSchemaOptional, MAX_STRING_LENGTH_DEFAULT, userIdSchema } from "../general-schemas.js";
import { combatStatsSchema } from "../character-schemas.js";
import { historyRecordSchema } from "../history-schemas.js";

export const patchCombatStatsPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "combat-category": z.string().max(MAX_STRING_LENGTH_DEFAULT),
    "combat-skill-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type PatchCombatStatsPathParams = z.infer<typeof patchCombatStatsPathParamsSchema>;

export const patchCombatStatsRequestSchema = z
  .object({
    skilledAttackValue: initialIncreasedSchemaOptional,
    skilledParadeValue: initialIncreasedSchemaOptional,
  })
  .strict();

export type PatchCombatStatsRequest = z.infer<typeof patchCombatStatsRequestSchema>;

export const updateCombatStatsResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    combatCategory: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    combatSkillName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    combatStats: z
      .object({
        old: combatStatsSchema,
        new: combatStatsSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateCombatStatsResponse = z.infer<typeof updateCombatStatsResponseSchema>;

export const patchCombatStatsHistoryRecordSchema = historyRecordSchema.extend({
  data: z
    .object({
      old: combatStatsSchema,
      new: combatStatsSchema,
    })
    .strict(),
});

export type PatchCombatStatsHistoryRecord = z.infer<typeof patchCombatStatsHistoryRecordSchema>;

export const patchCombatStatsResponseSchema = z
  .object({
    data: updateCombatStatsResponseSchema,
    historyRecord: patchCombatStatsHistoryRecordSchema.nullable(),
  })
  .strict();

export type PatchCombatStatsResponse = z.infer<typeof patchCombatStatsResponseSchema>;
