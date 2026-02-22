import { z } from "zod";
import { MAX_LEVEL, MIN_LEVEL } from "./general-schemas.js";

export const levelSchema = z.number().int().min(MIN_LEVEL).max(MAX_LEVEL);

export type Level = z.infer<typeof levelSchema>;

export const LEVEL_UP_DICE_EXPRESSION = "1d4+2" as const;
export const LEVEL_UP_DICE_MIN_TOTAL = 3;
export const LEVEL_UP_DICE_MAX_TOTAL = 6;

export const levelUpEffectKindSchema = z.enum([
  "hpRoll",
  "armorLevelRoll",
  "initiativePlusOne",
  "luckPlusOne",
  "bonusActionPlusOne",
  "legendaryActionPlusOne",
  "rerollUnlock",
]);

export type LevelUpEffectKind = z.infer<typeof levelUpEffectKindSchema>;

export const levelUpDiceRollSchema = z.number().int().min(LEVEL_UP_DICE_MIN_TOTAL).max(LEVEL_UP_DICE_MAX_TOTAL);

const levelUpDiceEffectSchema = z
  .object({
    kind: z.union([z.literal("hpRoll"), z.literal("armorLevelRoll")]),
    roll: z
      .object({
        dice: z.literal(LEVEL_UP_DICE_EXPRESSION),
        value: levelUpDiceRollSchema,
      })
      .strict(),
  })
  .strict();

const levelUpIncrementEffectSchema = z
  .object({
    kind: z.union([
      z.literal("initiativePlusOne"),
      z.literal("luckPlusOne"),
      z.literal("bonusActionPlusOne"),
      z.literal("legendaryActionPlusOne"),
    ]),
    delta: z.literal(1),
  })
  .strict();

const levelUpUnlockEffectSchema = z
  .object({
    kind: z.literal("rerollUnlock"),
  })
  .strict();

export const effectByLevelUpSchema = z.union([
  levelUpDiceEffectSchema,
  levelUpIncrementEffectSchema,
  levelUpUnlockEffectSchema,
]);

export type EffectByLevelUp = z.infer<typeof effectByLevelUpSchema>;

export const selectionCountSchema = z.number().int().min(0).max(MAX_LEVEL);

export const levelUpEffectProgressSchema = z
  .object({
    selectionCount: selectionCountSchema,
    firstChosenLevel: levelSchema.min(MIN_LEVEL + 1),
    lastChosenLevel: levelSchema.min(MIN_LEVEL + 1),
  })
  .strict();

export type LevelUpEffectProgress = z.infer<typeof levelUpEffectProgressSchema>;

const effectProgressShape = Object.fromEntries(
  levelUpEffectKindSchema.options.map((kind) => [kind, levelUpEffectProgressSchema])
) as Record<LevelUpEffectKind, typeof levelUpEffectProgressSchema>;

export const levelUpProgressSchema = z
  .object({
    effectsByLevel: z.record(z.string(), effectByLevelUpSchema).default({}),
    effects: z.object(effectProgressShape).partial().strict().default({}),
  })
  .strict()
  .default({
    effectsByLevel: {},
    effects: {},
  });

export type LevelUpProgress = z.infer<typeof levelUpProgressSchema>;
