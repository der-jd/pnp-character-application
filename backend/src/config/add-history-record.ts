import { z } from "zod";
import { recordSchema } from "api-spec/src/history-schemas.js";
import { userIdSchema } from "api-spec/src/general-schemas.js";

export const addHistoryRecordPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type AddHistoryRecordPathParams = z.infer<typeof addHistoryRecordPathParamsSchema>;

export const addHistoryRecordRequestSchema = recordSchema
  .omit({
    number: true,
    id: true,
    timestamp: true,
  })
  .extend({
    userId: userIdSchema,
  })
  .strict();

export type AddHistoryRecordRequest = z.infer<typeof addHistoryRecordRequestSchema>;

export const addHistoryRecordResponseSchema = recordSchema;

export type AddHistoryRecordResponse = z.infer<typeof addHistoryRecordResponseSchema>;
