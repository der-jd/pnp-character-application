import {
  BaseValues,
  CharacterSheet,
  EffectByLevelUp,
  LEVEL_UP_DICE_EXPRESSION,
  LevelUpEffectKind,
  LevelUpOption,
  LevelUpProgress,
  levelUpEffectKindSchema,
  LevelUpChange,
} from "api-spec";
import { createHash } from "crypto";
import { HttpError } from "../errors.js";
import { levelUpOptionsConfig } from "./constants.js";

export function computeLevelUpOptions(nextLevel: number, progress: LevelUpProgress): LevelUpOption[] {
  console.log("Compute level-up options for level ", nextLevel);
  console.debug("Progress: ", progress);
  const options: LevelUpOption[] = [];

  for (const kind of levelUpEffectKindSchema.options as LevelUpEffectKind[]) {
    let description: string;
    let diceExpression: string | undefined = undefined;

    switch (kind) {
      case "hpRoll":
        description = `+${LEVEL_UP_DICE_EXPRESSION} Health Points`;
        diceExpression = LEVEL_UP_DICE_EXPRESSION;
        break;
      case "armorLevelRoll":
        description = `+${LEVEL_UP_DICE_EXPRESSION} Armor Level`;
        diceExpression = LEVEL_UP_DICE_EXPRESSION;
        break;
      case "initiativePlusOne":
        description = `+1 Initiative Base Value`;
        break;
      case "luckPlusOne":
        description = `+1 Luck`;
        break;
      case "bonusActionPlusOne":
        description = `+1 Bonus Action per Combat Round`;
        break;
      case "legendaryActionPlusOne":
        description = `+1 Legendary Action`;
        break;
      case "rerollUnlock":
        description = `Unlock reroll`;
        break;
      default:
        throw new Error(`Unknown level up effect kind: ${kind}`);
    }

    let reasonIfDenied: string = "";
    const _firstLevelReached = firstLevelReached(nextLevel, kind);
    if (!_firstLevelReached) {
      reasonIfDenied += ` Only available at level ${String(levelUpOptionsConfig[kind].firstAllowedLevel)}. `;
    }
    const _cooldownSatisfied = cooldownSatisfied(nextLevel, kind, progress);
    if (!_cooldownSatisfied) {
      reasonIfDenied += ` Next available at level ${String((progress.effects[kind]?.lastChosenLevel ?? 0) + levelUpOptionsConfig[kind].cooldownLevels + 1)}.`;
    }
    const _belowMaxSelectionCount = belowMaxSelectionCount(kind, progress);
    if (!_belowMaxSelectionCount) {
      reasonIfDenied += ` Maximum of ${levelUpOptionsConfig[kind].maxSelectionCount} reached.`;
    }
    const normalizedReasonIfDenied = reasonIfDenied.trim();

    options.push({
      kind,
      description,
      allowed: _firstLevelReached && _cooldownSatisfied && _belowMaxSelectionCount,
      firstLevel: levelUpOptionsConfig[kind].firstAllowedLevel,
      selectionCount: progress.effects[kind]?.selectionCount ?? 0,
      maxSelectionCount: levelUpOptionsConfig[kind].maxSelectionCount,
      cooldownLevels: levelUpOptionsConfig[kind].cooldownLevels,
      reasonIfDenied: normalizedReasonIfDenied === "" ? undefined : normalizedReasonIfDenied,
      diceExpression,
      firstChosenLevel: progress.effects[kind]?.firstChosenLevel,
      lastChosenLevel: progress.effects[kind]?.lastChosenLevel,
    });
  }

  console.debug("Options: ", options);
  return options;
}

function firstLevelReached(nextLevel: number, kind: LevelUpEffectKind): boolean {
  return nextLevel >= levelUpOptionsConfig[kind].firstAllowedLevel;
}

function cooldownSatisfied(nextLevel: number, kind: LevelUpEffectKind, progress: LevelUpProgress): boolean {
  const lastChosenLevel = progress.effects[kind]?.lastChosenLevel;
  return lastChosenLevel === undefined || nextLevel - lastChosenLevel > levelUpOptionsConfig[kind].cooldownLevels;
}

function belowMaxSelectionCount(kind: LevelUpEffectKind, progress: LevelUpProgress): boolean {
  const selectionCount = progress.effects[kind]?.selectionCount ?? 0;
  return selectionCount < levelUpOptionsConfig[kind].maxSelectionCount;
}

export function computeLevelUpOptionsHash(levelUpOptions: LevelUpOption[]): string {
  console.log("Compute hash of level-up options");
  const json = JSON.stringify(levelUpOptions);
  const hash = createHash("sha256").update(json).digest("hex");
  console.log("Hash:", hash);
  return hash;
}

export function planApplyLevelUp(characterSheet: CharacterSheet, effect: EffectByLevelUp): LevelUpChange {
  console.log(
    `Plan apply level-up with effect '${effect.kind}' to level ${characterSheet.generalInformation.level + 1}`
  );
  const newBaseValues: Partial<BaseValues> = {};
  const baseValues = characterSheet.baseValues;
  const newSpecialAbilities: CharacterSheet["specialAbilities"] = [];

  function updateBaseValue(name: keyof BaseValues, byLvlUp: number) {
    newBaseValues[name] = {
      ...baseValues[name],
      byLvlUp: (baseValues[name].byLvlUp ?? 0) + byLvlUp,
      current: baseValues[name].current + byLvlUp,
    };
  }

  switch (effect.kind) {
    case "hpRoll":
      updateBaseValue("healthPoints", effect.roll.value);
      break;
    case "armorLevelRoll":
      updateBaseValue("armorLevel", effect.roll.value);
      break;
    case "initiativePlusOne":
      updateBaseValue("initiativeBaseValue", effect.delta);
      break;
    case "luckPlusOne":
      updateBaseValue("luckPoints", effect.delta);
      break;
    case "bonusActionPlusOne":
      updateBaseValue("bonusActionsPerCombatRound", effect.delta);
      break;
    case "legendaryActionPlusOne":
      updateBaseValue("legendaryActions", effect.delta);
      break;
    case "rerollUnlock":
      newSpecialAbilities.push(...characterSheet.specialAbilities, "Reroll");
      break;
    default:
      throw new HttpError(400, "Unknown level-up effect kind");
  }

  const progress = structuredClone(characterSheet.generalInformation.levelUpProgress);
  const nextLevel = characterSheet.generalInformation.level + 1;
  // Add level up effect to progress
  progress.effectsByLevel[String(nextLevel)] = effect;

  // Update effect kind progress
  const existingProgress = progress.effects[effect.kind];
  progress.effects[effect.kind] = {
    selectionCount: (existingProgress?.selectionCount ?? 0) + 1,
    firstChosenLevel: existingProgress?.firstChosenLevel ?? nextLevel,
    lastChosenLevel: nextLevel,
  };

  const plan: LevelUpChange = {
    level: nextLevel,
    levelUpProgress: progress,
    baseValues: Object.keys(newBaseValues).length ? newBaseValues : undefined,
    specialAbilities: newSpecialAbilities.length ? newSpecialAbilities : undefined,
  };
  console.log("Plan:", plan);

  return plan;
}
