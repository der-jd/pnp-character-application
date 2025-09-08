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

/**
 * An user ID is not necessarily an UUID (36 characters), but a string with a certain length.
 */
export const userIdSchema = z.string().min(30).max(50);
