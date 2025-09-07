import { z } from "zod";

export const initialNewSchema = z
  .object({
    initialValue: z.number().int(),
    newValue: z.number().int(),
  })
  .strict();

export type InitialNew = z.infer<typeof initialNewSchema>;

export const initialIncreasedSchema = z
  .object({
    initialValue: z.number().int(),
    increasedPoints: z.number().int(),
  })
  .strict();

export type InitialIncreased = z.infer<typeof initialIncreasedSchema>;
