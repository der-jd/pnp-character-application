import { z } from "zod";
import { initialNewSchema, MAX_STRING_LENGTH_DEFAULT, userIdSchema } from "../general-schemas.js";
import { baseValueChangeSchema, historyRecordSchema } from "../history-schemas.js";

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
    mod: initialNewSchema.optional(),
  })
  .strict();

export type PatchBaseValueRequest = z.infer<typeof patchBaseValueRequestSchema>;

export const updateBaseValueResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    baseValueName: z.string().max(MAX_STRING_LENGTH_DEFAULT),
    changes: z
      .object({
        old: baseValueChangeSchema,
        new: baseValueChangeSchema,
      })
      .strict(),
  })
  .strict();

export type UpdateBaseValueResponse = z.infer<typeof updateBaseValueResponseSchema>;

export const patchBaseValueHistoryRecordSchema = historyRecordSchema.extend({
  data: z
    .object({
      old: baseValueChangeSchema,
      new: baseValueChangeSchema,
    })
    .strict(),
});

export type PatchBaseValueHistoryRecord = z.infer<typeof patchBaseValueHistoryRecordSchema>;

export const patchBaseValueResponseSchema = z
  .object({
    data: updateBaseValueResponseSchema,
    historyRecord: patchBaseValueHistoryRecordSchema.nullable(),
  })
  .strict();

export type PatchBaseValueResponse = z.infer<typeof patchBaseValueResponseSchema>;
