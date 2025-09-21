import { z } from "zod";
import {
  initialNewSchema,
  initialIncreasedSchema,
  userIdSchema,
  MAX_STRING_LENGTH_DEFAULT,
  MAX_COST,
} from "../general-schemas.js";
import { skillSchema, combatStatsSchema, calculationPointsSchema, learningMethodSchema } from "../character-schemas.js";
import { recordSchema, skillChangeSchema } from "../history-schemas.js";

export const patchSkillPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "skill-category": z.string().max(MAX_STRING_LENGTH_DEFAULT),
    "skill-name": z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type PatchSkillPathParams = z.infer<typeof patchSkillPathParamsSchema>;

export const patchSkillRequestSchema = z
  .object({
    activated: z.boolean().optional(),
    start: initialNewSchema.optional(),
    current: initialIncreasedSchema.optional(),
    mod: initialNewSchema.optional(),
    learningMethod: learningMethodSchema.optional(),
  })
  .strict();

export type PatchSkillRequest = z.infer<typeof patchSkillRequestSchema>;

export const updateSkillResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    skillCategory: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    skillName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    combatCategory: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    changes: z
      .object({
        old: z
          .object({
            skill: skillSchema,
            combatStats: combatStatsSchema.optional(),
          })
          .strict(),
        new: z
          .object({
            skill: skillSchema,
            combatStats: combatStatsSchema.optional(),
          })
          .strict(),
      })
      .strict(),
    learningMethod: learningMethodSchema.optional(),
    increaseCost: z.number().min(0).max(MAX_COST).optional(),
    adventurePoints: z
      .object({
        old: calculationPointsSchema,
        new: calculationPointsSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateSkillResponse = z.infer<typeof updateSkillResponseSchema>;

export const patchSkillHistoryRecordSchema = recordSchema.extend({
  data: z
    .object({
      old: skillChangeSchema,
      new: skillChangeSchema,
    })
    .strict(),
});

export type PatchSkillHistoryRecord = z.infer<typeof patchSkillHistoryRecordSchema>;

export const patchSkillResponseSchema = z
  .object({
    data: updateSkillResponseSchema,
    historyRecord: patchSkillHistoryRecordSchema.nullable(),
  })
  .strict();

export type PatchSkillResponse = z.infer<typeof patchSkillResponseSchema>;
