import { z } from "zod";
import { historyBlockSchema } from "../history-schemas.js";
import { MAX_ARRAY_SIZE } from "../general-schemas.js";

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
      .optional(),
  })
  .strict()
  .optional();

export type GetHistoryQueryParams = z.infer<typeof getHistoryQueryParamsSchema>;

export const getHistoryResponseSchema = z
  .object({
    previousBlockNumber: z.number().int().positive().nullable(),
    previousBlockId: z.uuid().nullable(),
    items: z.array(historyBlockSchema).max(MAX_ARRAY_SIZE),
  })
  .strict();

export type GetHistoryResponse = z.infer<typeof getHistoryResponseSchema>;
