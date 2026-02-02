import { z } from "zod";
import { MAX_STRING_LENGTH_DEFAULT, userIdSchema } from "../general-schemas.js";
import { levelUpChangeSchema, recordSchema } from "../history-schemas.js";
import { levelUpDiceRollSchema, levelUpEffectKindSchema, levelSchema } from "../level-up-schemas.js";

export const postLevelUpPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type PostLevelUpPathParams = z.infer<typeof postLevelUpPathParamsSchema>;

export const postLevelUpRequestSchema = z
  .object({
    initialLevel: levelSchema,
    selectedEffect: levelUpEffectKindSchema,
    effectParams: z
      .object({
        roll: levelUpDiceRollSchema,
      })
      .strict()
      .optional(),
    optionsHash: z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type PostLevelUpRequest = z.infer<typeof postLevelUpRequestSchema>;

export const applyLevelUpResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    changes: z
      .object({
        old: levelUpChangeSchema,
        new: levelUpChangeSchema,
      })
      .strict(),
  })
  .strict();

export type ApplyLevelUpResponse = z.infer<typeof applyLevelUpResponseSchema>;

export const postLevelUpHistoryRecordSchema = recordSchema.extend({
  data: z
    .object({
      old: levelUpChangeSchema,
      new: levelUpChangeSchema,
    })
    .strict(),
});

export type PostLevelUpHistoryRecord = z.infer<typeof postLevelUpHistoryRecordSchema>;

export const postLevelUpResponseSchema = z
  .object({
    data: applyLevelUpResponseSchema,
    historyRecord: postLevelUpHistoryRecordSchema.nullable(),
  })
  .strict();

export type PostLevelUpResponse = z.infer<typeof postLevelUpResponseSchema>;
