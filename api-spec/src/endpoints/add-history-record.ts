import { record, z } from "zod";
import { recordSchema, RecordType } from "../history-schemas.js";
import { calculationPointsSchema } from "../character-schemas.js";
import { userIdSchema } from "../general-schemas.js";

export const addHistoryRecordPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type AddHistoryRecordPathParams = z.infer<typeof addHistoryRecordPathParamsSchema>;

export const addHistoryRecordRequestSchema = z
  .object({
    userId: userIdSchema,
    type: z.nativeEnum(RecordType),
    name: z.string(),
    data: z
      .object({
        old: z.record(z.string(), z.unknown()),
        new: z.record(z.string(), z.unknown()),
      })
      .strict(),
    learningMethod: z.string().nullable(),
    calculationPoints: z
      .object({
        adventurePoints: z
          .object({
            old: calculationPointsSchema,
            new: calculationPointsSchema,
          })
          .strict()
          .nullable(),
        attributePoints: z
          .object({
            old: calculationPointsSchema,
            new: calculationPointsSchema,
          })
          .strict()
          .nullable(),
      })
      .strict(),
    comment: z.string().nullable(),
  })
  .strict();

export type AddHistoryRecordRequest = z.infer<typeof addHistoryRecordRequestSchema>;

export const addHistoryRecordResponseSchema = recordSchema;

export type AddHistoryRecordResponse = z.infer<typeof addHistoryRecordResponseSchema>;
