import { z } from "zod";
import {
  MAX_ARRAY_SIZE,
  MAX_STRING_LENGTH_DEFAULT,
  MAX_STRING_LENGTH_VERY_LONG,
  MIN_LEVEL,
  userIdSchema,
} from "../general-schemas.js";
import { levelSchema, levelUpEffectKindSchema, selectionCountSchema } from "../level-up-schemas.js";

export const levelUpOptionSchema = z
  .object({
    kind: levelUpEffectKindSchema,
    description: z.string().max(MAX_STRING_LENGTH_VERY_LONG),
    allowed: z.boolean(),
    firstLevel: levelSchema.min(MIN_LEVEL + 1),
    selectionCount: selectionCountSchema,
    maxSelectionCount: selectionCountSchema,
    cooldownLevels: levelSchema,
    reasonIfDenied: z.string().max(MAX_STRING_LENGTH_VERY_LONG).optional(),
    diceExpression: z.string().max(MAX_STRING_LENGTH_DEFAULT).optional(),
    firstChosenLevel: levelSchema.min(MIN_LEVEL + 1).optional(),
    lastChosenLevel: levelSchema.min(MIN_LEVEL + 1).optional(),
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
