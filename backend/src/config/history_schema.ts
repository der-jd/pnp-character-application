import { z } from "zod";

export const recordSchema = z.object({
  type: z.string(),
  name: z.string(),
  number: z.number(),
  id: z.string(),
  data: z.object({
    old: z.record(z.any()),
    new: z.record(z.any()),
  }),
  learningMethod: z.string(),
  calculationPointsChange: z.object({
    adjustment: z.number(),
    old: z.number(),
    new: z.number(),
  }),
  comment: z.string(),
  timestamp: z.string().datetime(), // YYYY-MM-DDThh:mm:ssZ/±hh:mm, e.g. 2025-03-24T16:34:56Z (UTC) or 2025-03-24T16:34:56+02:00
});

export type Record = z.infer<typeof recordSchema>;

export const historyBlockSchema = z.object({
  characterId: z.string(),
  blockNumber: z.number(),
  blockId: z.string(),
  previousBlockId: z.string().nullable(),
  changes: z.array(recordSchema),
});

export type HistoryBlock = z.infer<typeof historyBlockSchema>;
