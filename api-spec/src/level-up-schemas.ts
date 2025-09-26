import { z } from "zod";
import { MAX_LEVEL } from "./general-schemas.js";

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

const levelUpRerollUnlockEffectSchema = z
  .object({
    kind: z.literal("rerollUnlock"),
  })
  .strict();

export const levelUpEffectSchema = z.union([
  levelUpDiceEffectSchema,
  levelUpIncrementEffectSchema,
  levelUpRerollUnlockEffectSchema,
]);

export type LevelUpEffect = z.infer<typeof levelUpEffectSchema>;

export const levelUpProgressSchema = z
  .object({
    effectsByLevel: z.record(z.string(), z.array(levelUpEffectSchema).max(MAX_LEVEL)).default({}),
    flags: z
      .object({
        rerollUnlocked: z.boolean().default(false),
      })
      .strict()
      .default({ rerollUnlocked: false }),
  })
  .strict()
  .default({
    effectsByLevel: {},
    flags: { rerollUnlocked: false },
  });

export type LevelUpProgress = z.infer<typeof levelUpProgressSchema>;
