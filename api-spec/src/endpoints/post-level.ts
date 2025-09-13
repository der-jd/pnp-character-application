import { z } from "zod";
import { userIdSchema } from "../general-schemas.js";
import { levelSchema } from "../character-schemas.js";
import { integerSchema, recordSchema } from "../history-schemas.js";

export const postLevelPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type PostLevelPathParams = z.infer<typeof postLevelPathParamsSchema>;

export const postLevelRequestSchema = z
  .object({
    initialLevel: levelSchema,
  })
  .strict();

export type PostLevelRequest = z.infer<typeof postLevelRequestSchema>;

export const updateLevelResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    level: z
      .object({
        old: z.object({ value: levelSchema }).strict(),
        new: z.object({ value: levelSchema }).strict(),
      })
      .strict(),
  })
  .strict();

export type UpdateLevelResponse = z.infer<typeof updateLevelResponseSchema>;

export const postLevelHistoryRecordSchema = recordSchema.extend({
  data: z
    .object({
      old: integerSchema,
      new: integerSchema,
    })
    .strict(),
});

export type PostLevelHistoryRecord = z.infer<typeof postLevelHistoryRecordSchema>;

export const postLevelResponseSchema = z
  .object({
    data: updateLevelResponseSchema,
    historyRecord: postLevelHistoryRecordSchema.nullable(),
  })
  .strict();

export type PostLevelResponse = z.infer<typeof postLevelResponseSchema>;
