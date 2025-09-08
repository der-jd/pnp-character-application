import { z } from "zod";

export const MAX_STRING_LENGTH_SHORT = 30;
export const MAX_STRING_LENGTH_DEFAULT = 120;
export const MAX_STRING_LENGTH_LONG = 500;
export const MAX_STRING_LENGTH_VERY_LONG = 1000;

export const MAX_POINTS = 1000000; // 1 million
export const MAX_COST = 100000; // 100k cost max
export const MAX_ARRAY_SIZE = 1000; // 1000 items

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
