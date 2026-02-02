import {
  Character,
  CharacterSheet,
  LEVEL_UP_DICE_EXPRESSION,
  LevelUpEffectKind,
  LevelUpOption,
  LevelUpProgress,
  levelUpEffectKindSchema,
} from "api-spec";
import { createHash } from "crypto";
import { HttpError } from "../errors.js";
import { levelUpOptionsConfig } from "./constants.js";

// TODO delete -> now integrated into the levelUpProgressSchema
export type LevelCounters = {
  countByKind: Partial<Record<LevelUpEffectKind, number>>;
  firstChosenLevel: Partial<Record<LevelUpEffectKind, number>>;
  lastChosenLevel: Partial<Record<LevelUpEffectKind, number>>;
};

// TODO delete -> now integrated into the levelUpProgressSchema
export function computeLevelCounters(progress: LevelUpProgress): LevelCounters {
  const firstChosenLevel: Partial<Record<LevelUpEffectKind, number>> = {};
  const lastChosenLevel: Partial<Record<LevelUpEffectKind, number>> = {};
  const countByKind: Partial<Record<LevelUpEffectKind, number>> = {};

  const levels = Object.keys(progress.effectsByLevel)
    .map((k) => Number(k))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  for (const lvl of levels) {
    const effects = progress.effectsByLevel[String(lvl)] ?? [];
    for (const eff of effects) {
      const kind = eff.kind as LevelUpEffectKind;
      countByKind[kind] = (countByKind[kind] ?? 0) + 1;
      if (firstChosenLevel[kind] === undefined) {
        firstChosenLevel[kind] = lvl;
      }
      lastChosenLevel[kind] = lvl;
    }
  }

  return { firstChosenLevel, lastChosenLevel, countByKind };
}

export function computeLevelUpOptions(nextLevel: number, progress: LevelUpProgress): LevelUpOption[] {
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

function stableOptionsHashInput(character: Character) {
  const relevantBaseValues = {
    healthPoints: character.characterSheet.baseValues.healthPoints.current,
    armorLevel: character.characterSheet.baseValues.armorLevel.current,
    initiativeBaseValue: character.characterSheet.baseValues.initiativeBaseValue.current,
    luckPoints: character.characterSheet.baseValues.luckPoints.current,
    bonusActionsPerCombatRound: character.characterSheet.baseValues.bonusActionsPerCombatRound.current,
    legendaryActions: character.characterSheet.baseValues.legendaryActions.current,
  };

  return {
    characterId: character.characterId,
    nextLevel: character.characterSheet.generalInformation.level + 1,
    // TODO progress is unsorted?! it must be sorted
    levelUpProgress: character.characterSheet.generalInformation.levelUpProgress,
    relevantBaseValues,
  };
}

function hashObject(obj: unknown): string {
  const json = JSON.stringify(obj);
  return createHash("sha256").update(json).digest("hex");
}

export function computeLevelUpOptionsHash(character: Character): string {
  const hashInput = stableOptionsHashInput(character);
  return hashObject(hashInput);
}

// TODO remove this function. it does not make sense
function validateDiceValue(diceExpression: string, value: number): boolean {
  if (diceExpression !== LEVEL_UP_DICE_EXPRESSION) return false;
  return value >= 3 && value <= 6;
}

export type LevelUpApplyPlan = {
  nextLevel: number;
  // maps of base value name to old/new BaseValue objects
  oldBaseValues: Partial<Character["characterSheet"]["baseValues"]>;
  newBaseValues: Partial<Character["characterSheet"]["baseValues"]>;
  // updated progress to persist
  newProgress: LevelUpProgress;
  // effect payload to store
  effect: any; // Use API type at lambda boundary
  // old/new snapshots
  old: {
    level: { value: number };
    baseValues?: Partial<Character["characterSheet"]["baseValues"]>;
    flags?: { rerollUnlocked: boolean };
  };
  newly: {
    level: { value: number };
    baseValues?: Partial<Character["characterSheet"]["baseValues"]>;
    flags?: { rerollUnlocked: boolean };
  };
};

// TODO consider idempotent retries
export function planApplyLevelUp(
  characterSheet: CharacterSheet,
  selectedEffect: LevelUpEffectKind,
  roll?: number,
): LevelUpApplyPlan {
  const nextLevel = characterSheet.generalInformation.level + 1;
  const progress = characterSheet.generalInformation.levelUpProgress;
  const options = computeLevelUpOptions(nextLevel, progress, levelCounters);

  const chosen = options.find((o) => o.kind === selectedEffect);
  if (!chosen || !chosen.allowed) {
    throw new HttpError(400, "Selected effect is not allowed for this level");
  }

  // Prepare changes
  const baseValuesState = characterSheet.baseValues;
  const oldBaseValues: Partial<Character["characterSheet"]["baseValues"]> = {};
  const newBaseValues: Partial<Character["characterSheet"]["baseValues"]> = {};
  const newProgress: LevelUpProgress = {
    effectsByLevel: { ...progress.effectsByLevel },
    flags: { rerollUnlocked: !!progress.flags?.rerollUnlocked },
  };

  function addEffectToProgress(effect: any) {
    const key = String(nextLevel);
    const arr = newProgress.effectsByLevel[key] ?? [];
    newProgress.effectsByLevel[key] = [...arr, effect];
  }

  let effectPayload: any = undefined;

  switch (selectedEffect) {
    case "hpRoll": {
      const roll = params.roll ?? 0;
      if (!validateDiceValue(LEVEL_UP_DICE_EXPRESSION, roll)) {
        throw new HttpError(400, "Invalid dice roll value for hpRoll");
      }
      const old = baseValuesState.healthPoints;
      const newVal = {
        start: old.start,
        current: old.current + roll,
        byFormula: old.byFormula,
        byLvlUp: (old.byLvlUp ?? 0) + roll,
        mod: old.mod,
      };
      (oldBaseValues as any)["healthPoints"] = old;
      (newBaseValues as any)["healthPoints"] = newVal;
      effectPayload = { kind: "hpRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: roll } };
      addEffectToProgress(effectPayload);
      break;
    }
    case "armorLevelRoll": {
      const roll = params.roll ?? 0;
      if (!validateDiceValue(LEVEL_UP_DICE_EXPRESSION, roll)) {
        throw new HttpError(400, "Invalid dice roll value for armorLevelRoll");
      }
      const old = baseValuesState.armorLevel;
      const newVal = {
        start: old.start,
        current: old.current + roll,
        byFormula: old.byFormula,
        byLvlUp: (old.byLvlUp ?? 0) + roll,
        mod: old.mod,
      };
      (oldBaseValues as any)["armorLevel"] = old;
      (newBaseValues as any)["armorLevel"] = newVal;
      effectPayload = { kind: "armorRoll", roll: { dice: LEVEL_UP_DICE_EXPRESSION, value: roll } };
      addEffectToProgress(effectPayload);
      break;
    }
    case "initiativePlusOne": {
      const old = baseValuesState.initiativeBaseValue;
      const newVal = {
        start: old.start,
        current: old.current + 1,
        byFormula: old.byFormula,
        byLvlUp: (old.byLvlUp ?? 0) + 1,
        mod: old.mod,
      };
      (oldBaseValues as any)["initiativeBaseValue"] = old;
      (newBaseValues as any)["initiativeBaseValue"] = newVal;
      effectPayload = { kind: "initiativePlusOne", delta: 1 };
      addEffectToProgress(effectPayload);
      break;
    }
    case "luckPlusOne": {
      const old = baseValuesState.luckPoints;
      const newVal = {
        start: old.start,
        current: old.current + 1,
        byFormula: old.byFormula,
        byLvlUp: (old.byLvlUp ?? 0) + 1,
        mod: old.mod,
      };
      (oldBaseValues as any)["luckPoints"] = old;
      (newBaseValues as any)["luckPoints"] = newVal;
      effectPayload = { kind: "luckPlusOne", delta: 1 };
      addEffectToProgress(effectPayload);
      break;
    }
    case "bonusActionPlusOne": {
      const old = baseValuesState.bonusActionsPerCombatRound;
      const newVal = {
        start: old.start,
        current: old.current + 1,
        byFormula: old.byFormula,
        byLvlUp: (old.byLvlUp ?? 0) + 1,
        mod: old.mod,
      };
      (oldBaseValues as any)["bonusActionsPerCombatRound"] = old;
      (newBaseValues as any)["bonusActionsPerCombatRound"] = newVal;
      effectPayload = { kind: "bonusActionPlusOne", delta: 1 };
      addEffectToProgress(effectPayload);
      break;
    }
    case "legendaryActionPlusOne": {
      const old = baseValuesState.legendaryActions;
      const newVal = {
        start: old.start,
        current: old.current + 1,
        byFormula: old.byFormula,
        byLvlUp: (old.byLvlUp ?? 0) + 1,
        mod: old.mod,
      };
      (oldBaseValues as any)["legendaryActions"] = old;
      (newBaseValues as any)["legendaryActions"] = newVal;
      effectPayload = { kind: "legendaryActionPlusOne", delta: 1 };
      addEffectToProgress(effectPayload);
      break;
    }
    case "rerollUnlock": {
      newProgress.flags.rerollUnlocked = true;
      effectPayload = { kind: "rerollUnlock" };
      addEffectToProgress(effectPayload);
      break;
    }
    default:
      throw new HttpError(400, "Unknown level-up effect kind");
  }

  const oldFlags = { rerollUnlocked: !!progress.flags?.rerollUnlocked };
  const newFlags = { rerollUnlocked: !!newProgress.flags?.rerollUnlocked };

  return {
    nextLevel,
    oldBaseValues,
    newBaseValues,
    newProgress,
    effect: effectPayload,
    old: {
      level: { value: characterSheet.generalInformation.level },
      baseValues: Object.keys(oldBaseValues).length ? oldBaseValues : undefined,
      flags: oldFlags,
    },
    newly: {
      level: { value: nextLevel },
      baseValues: Object.keys(newBaseValues).length ? newBaseValues : undefined,
      flags: newFlags,
    },
  };
}
