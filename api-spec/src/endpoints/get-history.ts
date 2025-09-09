import { z } from "zod";
import { historyBlockSchema } from "../history-schemas.js";
import { MAX_ARRAY_SIZE, MAX_HISTORY_BLOCK_NUMBER, MIN_HISTORY_BLOCK_NUMBER } from "../general-schemas.js";

export const getHistoryPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type GetHistoryPathParams = z.infer<typeof getHistoryPathParamsSchema>;

export const getHistoryQueryParamsSchema = z
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
  .optional();

export type GetHistoryQueryParams = z.infer<typeof getHistoryQueryParamsSchema>;

export const getHistoryResponseSchema = z
  .object({
    previousBlockNumber: z
      .number()
      .int()
      .min(MIN_HISTORY_BLOCK_NUMBER)
      .max(MAX_HISTORY_BLOCK_NUMBER - 1)
      .nullable(),
    previousBlockId: z.uuid().nullable(),
    items: z.array(historyBlockSchema).max(MAX_ARRAY_SIZE),
  })
  .strict();

export type GetHistoryResponse = z.infer<typeof getHistoryResponseSchema>;
