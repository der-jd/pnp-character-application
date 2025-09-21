import { z } from "zod";

export const MAX_STRING_LENGTH_SHORT = 30;
export const MAX_STRING_LENGTH_DEFAULT = 120;
export const MAX_STRING_LENGTH_LONG = 500;
export const MAX_STRING_LENGTH_VERY_LONG = 1000;
export const MAX_HEADER_LENGTH = 2000;

export const MIN_POINTS = -10000;
export const MAX_POINTS = 1000000;
export const MAX_HISTORY_RECORDS = 1000000;
export const MIN_HISTORY_BLOCK_NUMBER = 1;
export const MAX_HISTORY_BLOCK_NUMBER = 100000;
export const MAX_COST = 100000;
export const MAX_ARRAY_SIZE = 1000;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 1000;
export const MIN_ATTRIBUTE_VALUE = -50;
export const MAX_ATTRIBUTE_VALUE = 1000;
export const MIN_BASE_VALUE = -200;
export const MIN_COMBAT_STAT = -10000;

export const initialNewSchema = z
  .object({
    initialValue: z.number().int().min(MIN_POINTS).max(MAX_POINTS),
    newValue: z.number().int().min(MIN_POINTS).max(MAX_POINTS),
  })
  .strict();

export type InitialNew = z.infer<typeof initialNewSchema>;

export const initialIncreasedSchema = z
  .object({
    initialValue: z.number().int().min(MIN_POINTS).max(MAX_POINTS),
    increasedPoints: z.number().int().min(0).max(MAX_POINTS),
  })
  .strict();

export type InitialIncreased = z.infer<typeof initialIncreasedSchema>;

/**
 * An user ID is not necessarily an UUID (36 characters), but a string with a certain length.
 */
export const userIdSchema = z.string().min(30).max(50);
