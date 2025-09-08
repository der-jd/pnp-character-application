import { uuid, z } from "zod";
import { historyBlockSchema } from "./history-schemas.js";

export const getHistoryPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
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
    previousBlockId: z.string().uuid().nullable(),
    items: z.array(historyBlockSchema),
  })
  .strict();

export type GetHistoryResponse = z.infer<typeof getHistoryResponseSchema>;
