import { z } from "zod";
import { MAX_STRING_LENGTH_VERY_LONG } from "../character-schemas.js";

export const setHistoryCommentPathParamsSchema = z
  .object({
    "character-id": z.string().uuid(),
    "record-id": z.string().uuid(),
  })
  .strict();

export type SetHistoryCommentPathParams = z.infer<typeof setHistoryCommentPathParamsSchema>;

export const setHistoryCommentQueryParamsSchema = z
  .object({
    "block-number": z
      .string()
      .regex(/^\d+$/)
      .transform((val) => parseInt(val, 10))
      .optional(),
  })
  .strict()
  .optional()
  .nullable();

export type SetHistoryCommentQueryParams = z.infer<typeof setHistoryCommentQueryParamsSchema>;

export const setHistoryCommentRequestSchema = z
  .object({
    comment: z.string().max(MAX_STRING_LENGTH_VERY_LONG),
  })
  .strict();

export type SetHistoryCommentRequest = z.infer<typeof setHistoryCommentRequestSchema>;

export const setHistoryCommentResponseSchema = z
  .object({
    characterId: z.string().uuid(),
    blockNumber: z.number().int().positive(),
    recordId: z.string().uuid(),
    comment: z.string(),
  })
  .strict();

export type SetHistoryCommentResponse = z.infer<typeof setHistoryCommentResponseSchema>;
