import { z } from "zod";
import {
  MAX_ARRAY_SIZE,
  MAX_LEVEL,
  MAX_STRING_LENGTH_DEFAULT,
  MAX_STRING_LENGTH_VERY_LONG,
  MIN_LEVEL,
  userIdSchema,
} from "../general-schemas.js";
import { levelUpEffectKindSchema } from "../level-up-schemas.js";
import { levelSchema } from "../character-schemas.js";

export const levelUpOptionSchema = z
  .object({
    kind: levelUpEffectKindSchema,
    description: z.string().max(MAX_STRING_LENGTH_VERY_LONG),
    diceExpression: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    allowed: z.boolean(),
    reasonIfDenied: z.string().max(MAX_STRING_LENGTH_VERY_LONG).optional(),
    currentCount: z.number().int().min(0).max(MAX_LEVEL).optional(),
    maxCount: z.number().int().min(0).max(MAX_LEVEL).optional(),
    firstLevel: levelSchema.min(MIN_LEVEL + 1).optional(),
    cooldownLevels: levelSchema.optional(),
    window: z
      .object({
        size: levelSchema,
        lastChosenLevel: levelSchema.min(MIN_LEVEL + 1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type LevelUpOption = z.infer<typeof levelUpOptionSchema>;

export const getLevelUpPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type GetLevelUpPathParams = z.infer<typeof getLevelUpPathParamsSchema>;

export const getLevelUpResponseSchema = z
  .object({
    characterId: z.uuid(),
    userId: userIdSchema,
    nextLevel: levelSchema.min(MIN_LEVEL + 1),
    options: z.array(levelUpOptionSchema).max(MAX_ARRAY_SIZE),
    optionsHash: z.string().max(MAX_STRING_LENGTH_DEFAULT),
  })
  .strict();

export type GetLevelUpResponse = z.infer<typeof getLevelUpResponseSchema>;
