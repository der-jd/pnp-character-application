import { z } from "zod";
import { historyRecordSchema } from "../history-schemas.js";

export const deleteHistoryRecordPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "record-id": z.uuid(),
  })
  .strict();

export type DeleteHistoryRecordPathParams = z.infer<typeof deleteHistoryRecordPathParamsSchema>;

export const deleteHistoryRecordResponseSchema = historyRecordSchema;

export type DeleteHistoryRecordResponse = z.infer<typeof deleteHistoryRecordResponseSchema>;
