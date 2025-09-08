import { z } from "zod";
import { recordSchema } from "./history-schemas.js";

export const revertHistoryRecordPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
    "record-id": z.string().uuid(),
  })
  .strict();

export type RevertHistoryRecordPathParams = z.infer<typeof revertHistoryRecordPathParamsSchema>;

export const revertHistoryRecordResponseSchema = recordSchema;

export type RevertHistoryRecordResponse = z.infer<typeof revertHistoryRecordResponseSchema>;
