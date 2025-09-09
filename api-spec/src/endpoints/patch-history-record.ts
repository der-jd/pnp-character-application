import { z } from "zod";
import { MAX_HISTORY_BLOCK_NUMBER, MAX_STRING_LENGTH_VERY_LONG, MIN_HISTORY_BLOCK_NUMBER } from "../general-schemas.js";

export const patchHistoryRecordPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
    "record-id": z.uuid(),
  })
  .strict();

export type PatchHistoryRecordPathParams = z.infer<typeof patchHistoryRecordPathParamsSchema>;

export const patchHistoryRecordQueryParamsSchema = z
  .object({
    "block-number": z
      .string()
      .regex(/^\d+$/)
      .transform((val) => parseInt(val, 10))
      .refine((val) => val >= MIN_HISTORY_BLOCK_NUMBER && val <= MAX_HISTORY_BLOCK_NUMBER, {
        message: `Block number must be between ${MIN_HISTORY_BLOCK_NUMBER} and ${MAX_HISTORY_BLOCK_NUMBER}`,
      })
      .optional(),
  })
  .strict()
  .nullable()
  .optional();

export type PatchHistoryRecordQueryParams = z.infer<typeof patchHistoryRecordQueryParamsSchema>;

export const patchHistoryRecordRequestSchema = z
  .object({
    comment: z.string().max(MAX_STRING_LENGTH_VERY_LONG),
  })
  .strict();

export type PatchHistoryRecordRequest = z.infer<typeof patchHistoryRecordRequestSchema>;

export const patchHistoryRecordResponseSchema = z
  .object({
    characterId: z.uuid(),
    blockNumber: z.number().int().min(MIN_HISTORY_BLOCK_NUMBER).max(MAX_HISTORY_BLOCK_NUMBER),
    recordId: z.uuid(),
    comment: z.string().max(MAX_STRING_LENGTH_VERY_LONG),
  })
  .strict();

export type PatchHistoryRecordResponse = z.infer<typeof patchHistoryRecordResponseSchema>;
