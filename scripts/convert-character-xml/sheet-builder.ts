import {
  ADVANTAGES,
  DISADVANTAGES,
  type Attributes,
  type BaseValue,
  type BaseValues,
  type CharacterSheet,
  type CombatSkillName,
  type CombatStats,
  CostCategory,
  DEFAULT_START_ADVENTURE_POINTS,
  DisadvantagesNames,
  type EffectByLevelUp,
  GENERATION_POINTS,
  HOBBY_SKILL_BONUS,
  type LevelUpEffectKind,
  type LevelUpProgress,
  LEVEL_UP_DICE_EXPRESSION,
  LEVEL_UP_DICE_MAX_TOTAL,
  LEVEL_UP_DICE_MIN_TOTAL,
  PROFESSION_SKILL_BONUS,
  type Skill,
  type SkillCategory,
  type SkillName,
  type SkillNameWithCategory,
  START_SKILLS,
  ATTRIBUTE_POINTS_FOR_CREATION,
  characterSheetSchema,
  combatSkills,
  levelUpProgressSchema,
} from "api-spec";
import type { XmlCharacterSheet, HistoryEntry, CombatCategory, AggregatedSkillModState } from "./types.js";
import {
  normalizeLabel,
  ensureArray,
  asText,
  asRecord,
  toInt,
  clamp,
  toOptionalInt,
  queueInfoBlock,
  hashCharacterName,
} from "./xml-utils.js";
import {
  COMBAT_SKILL_HANDLING,
  ATTRIBUTE_MAP,
  BASE_VALUE_MAP,
  NON_COMBAT_SKILL_MAP,
  COMBAT_SKILL_MAP,
  GEWUERFELTE_BEGABUNG_COMMENT,
  COMBAT_SKILL_HISTORY_TYPE_LABELS,
  ADVANTAGE_MAP,
  DISADVANTAGE_MAP,
  FEAR_OF_COST_BY_LABEL,
  FEAR_OF_DETAIL_BY_CHARACTER_HASH,
  DEFAULT_GENERAL_INFORMATION_SKILL,
  HISTORY_NAME_ADVENTURE_POINTS,
  HISTORY_TYPE_BASE_VALUE_EVENT,
  HISTORY_TYPE_CALCULATION_POINTS_EVENT,
  LEVEL_UP_COMMENT_PATTERN,
  BASE_VALUE_TO_LEVEL_UP_EFFECT,
  XML_CHARACTER_SHEET_KEYS,
  XML_HOBBY_NAME_TO_SKILL,
} from "./constants.js";

// ---------------------------------------------------------------------------
// Shared character-sheet building logic used by both Phase 1 and Phase 2.
// ---------------------------------------------------------------------------

/**
 * Builds a character sheet from an XML character sheet.
 * It does not take the history into account.
 * @param sheet The XML character sheet
 * @returns The built character sheet and any warnings
 */
export function buildCharacterSheet(sheet: XmlCharacterSheet): { characterSheet: CharacterSheet; warnings: string[] } {
  const warnings: string[] = [];
  const characterSheet = createEmptyCharacterSheet();

  applyGeneralInformation(sheet, characterSheet, warnings);

  applyAdvantagesAndDisadvantages(sheet, characterSheet, warnings);

  applyAttributes(sheet, characterSheet, warnings);

  applyBaseValues(sheet, characterSheet, warnings);

  const spentOnSkills = applyNonCombatSkills(sheet, characterSheet, warnings);
  const spentOnCombatSkills = applyCombatSkills(sheet, characterSheet, warnings);

  applyCalculationPoints(sheet, characterSheet, spentOnSkills, spentOnCombatSkills);

  return { characterSheet, warnings };
}

// ---------------------------------------------------------------------------
// Shared utility functions (exported for use by both phases)
// ---------------------------------------------------------------------------

export function recalculateCombatStats(
  stats: CombatStats,
  category: CombatCategory,
  skill: Skill,
  baseValues: BaseValues,
): CombatStats {
  const availablePoints =
    stats.handling + (skill.current + skill.mod) - (stats.skilledAttackValue + stats.skilledParadeValue);
  const updated: CombatStats = {
    ...stats,
    availablePoints,
  };

  if (category === "melee") {
    updated.attackValue =
      stats.skilledAttackValue + baseValues.attackBaseValue.current + baseValues.attackBaseValue.mod;
    updated.paradeValue =
      stats.skilledParadeValue + baseValues.paradeBaseValue.current + baseValues.paradeBaseValue.mod;
  } else {
    updated.attackValue =
      stats.skilledAttackValue + baseValues.rangedAttackBaseValue.current + baseValues.rangedAttackBaseValue.mod;
    updated.paradeValue = 0;
  }

  return updated;
}

export function mapNonCombatSkill(name: string): SkillNameWithCategory | null {
  if (!name) {
    return null;
  }
  return NON_COMBAT_SKILL_MAP.get(normalizeLabel(name)) ?? null;
}

export function splitSkill(skill: SkillNameWithCategory): { category: SkillCategory; name: SkillName } {
  const [category, name] = skill.split("/") as [SkillCategory, SkillName];
  return { category, name };
}

export function getSkillCategorySection(
  skills: CharacterSheet["skills"],
  category: SkillCategory,
): Record<string, Skill> {
  return skills[category] as Record<string, Skill>;
}

export function getCombatCategorySection(
  combat: CharacterSheet["combat"],
  category: CombatCategory,
): Record<string, CombatStats> {
  return combat[category] as Record<string, CombatStats>;
}

export function calculateGenerationPoints(characterSheet: CharacterSheet): {
  throughDisadvantages: number;
  spent: number;
  total: number;
} {
  const throughDisadvantages = characterSheet.disadvantages.reduce((sum, [, , value]) => sum + (value ?? 0), 0);
  const spent = characterSheet.advantages.reduce((sum, [, , value]) => sum + (value ?? 0), 0);
  return {
    throughDisadvantages,
    spent,
    total: GENERATION_POINTS + throughDisadvantages,
  };
}

export function extractLevelUpEffects(entries: HistoryEntry[]): Record<string, EffectByLevelUp> {
  const effectsByLevel: Record<string, EffectByLevelUp> = {};

  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.type]));
    if (typeLabel !== HISTORY_TYPE_BASE_VALUE_EVENT) {
      continue;
    }

    const comment = asText(entry[XML_CHARACTER_SHEET_KEYS.comment]);
    const levelMatch = comment.match(LEVEL_UP_COMMENT_PATTERN);
    if (!levelMatch) {
      continue;
    }
    const level = Number.parseInt(levelMatch[1], 10);
    if (Number.isNaN(level)) {
      continue;
    }

    const effectKind = BASE_VALUE_TO_LEVEL_UP_EFFECT[normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.name]))];
    if (!effectKind) {
      continue;
    }

    const newValue = toInt(entry[XML_CHARACTER_SHEET_KEYS.newValue], 0);
    const oldValue = toInt(entry[XML_CHARACTER_SHEET_KEYS.oldValue], 0);
    const delta = newValue - oldValue;
    if (delta <= 0 && effectKind !== "rerollUnlock") {
      continue;
    }

    let effect: EffectByLevelUp;
    if (effectKind === "hpRoll" || effectKind === "armorLevelRoll") {
      effect = {
        kind: effectKind,
        roll: {
          dice: LEVEL_UP_DICE_EXPRESSION,
          value: clamp(delta, LEVEL_UP_DICE_MIN_TOTAL, LEVEL_UP_DICE_MAX_TOTAL),
        },
      };
    } else if (effectKind === "rerollUnlock") {
      effect = { kind: effectKind };
    } else {
      effect = {
        kind: effectKind as Exclude<LevelUpEffectKind, "hpRoll" | "armorLevelRoll" | "rerollUnlock">,
        delta: 1,
      } as EffectByLevelUp;
    }

    const levelKey = String(level);
    if (!(levelKey in effectsByLevel)) {
      effectsByLevel[levelKey] = effect;
    }
  }

  return effectsByLevel;
}

export function buildLevelUpProgressFromEffects(effectsByLevel: Record<string, EffectByLevelUp>): LevelUpProgress {
  const progress = levelUpProgressSchema.parse({});
  const summaries: Partial<
    Record<LevelUpEffectKind, { selectionCount: number; firstChosenLevel: number; lastChosenLevel: number }>
  > = {};

  for (const [levelKey, effect] of Object.entries(effectsByLevel)) {
    const level = Number.parseInt(levelKey, 10);
    const summary = summaries[effect.kind];
    if (summary) {
      summary.selectionCount += 1;
      summary.lastChosenLevel = Math.max(summary.lastChosenLevel, level);
      summary.firstChosenLevel = Math.min(summary.firstChosenLevel, level);
    } else {
      summaries[effect.kind] = {
        selectionCount: 1,
        firstChosenLevel: level,
        lastChosenLevel: level,
      };
    }
  }

  progress.effectsByLevel = effectsByLevel;
  progress.effects = summaries as LevelUpProgress["effects"];
  return progress;
}

export function aggregateCombatSkillModEntries(entries: HistoryEntry[], warnings: string[]): HistoryEntry[] {
  const replacementByIndex = new Map<number, HistoryEntry>();
  const skipIndices = new Set<number>();
  const states = new Map<CombatSkillName, AggregatedSkillModState>();

  entries.forEach((entry, index) => {
    if (!isGewuerfelteBegabungCombatSkillEntry(entry)) {
      return;
    }

    const combatSkillName = getCombatSkillNameFromHistoryEntry(entry);
    if (!combatSkillName) {
      return;
    }

    skipIndices.add(index);
    const parsedOld = toOptionalInt(entry[XML_CHARACTER_SHEET_KEYS.oldValue]);
    const parsedNew = toOptionalInt(entry[XML_CHARACTER_SHEET_KEYS.newValue]);
    const displayName = asText(entry[XML_CHARACTER_SHEET_KEYS.name]);
    const existing = states.get(combatSkillName);

    if (!existing) {
      states.set(combatSkillName, {
        combatSkillName,
        firstIndex: index,
        firstEntry: entry,
        lastEntry: entry,
        oldValue: parsedOld,
        newValue: parsedNew,
        displayName,
      });
      return;
    }

    existing.lastEntry = entry;
    if (existing.oldValue === null && parsedOld !== null) {
      existing.oldValue = parsedOld;
    }
    if (parsedNew !== null) {
      existing.newValue = parsedNew;
    }
  });

  if (states.size === 0) {
    return entries;
  }

  for (const state of states.values()) {
    const fallbackOldValue = asText(state.firstEntry[XML_CHARACTER_SHEET_KEYS.oldValue]);
    const fallbackNewValue = asText(state.lastEntry[XML_CHARACTER_SHEET_KEYS.newValue]);
    if (state.oldValue === null || state.newValue === null) {
      warnings.push(
        `Incomplete Gewürfelte Begabung history data for combat skill '${state.displayName}', using available values`,
      );
    }
    const replacement: HistoryEntry = {
      ...state.firstEntry,
      [XML_CHARACTER_SHEET_KEYS.oldValue]: state.oldValue !== null ? state.oldValue.toString() : fallbackOldValue,
      [XML_CHARACTER_SHEET_KEYS.newValue]: state.newValue !== null ? state.newValue.toString() : fallbackNewValue,
      [XML_CHARACTER_SHEET_KEYS.date]:
        state.lastEntry[XML_CHARACTER_SHEET_KEYS.date] ?? state.firstEntry[XML_CHARACTER_SHEET_KEYS.date],
      [XML_CHARACTER_SHEET_KEYS.name]: state.firstEntry[XML_CHARACTER_SHEET_KEYS.name] ?? state.displayName,
    };
    replacementByIndex.set(state.firstIndex, replacement);
  }

  return entries.reduce<HistoryEntry[]>((result, entry, index) => {
    const replacement = replacementByIndex.get(index);
    if (replacement) {
      result.push(replacement);
      return result;
    }
    if (skipIndices.has(index)) {
      return result;
    }
    result.push(entry);
    return result;
  }, []);
}

export function createEmptyCharacterSheet(): CharacterSheet {
  const zeroAttribute = () => ({ start: 0, current: 0, mod: 0, totalCost: 0 });
  const zeroBaseValue = (): BaseValue => ({ start: 0, current: 0, mod: 0 });
  const zeroSkill = (skill: SkillNameWithCategory): Skill => ({
    activated: START_SKILLS.includes(skill),
    start: 0,
    current: 0,
    mod: 0,
    totalCost: 0,
    defaultCostCategory: combatSkills.includes(skill) ? CostCategory.CAT_3 : CostCategory.CAT_2,
  });

  const skills = Object.fromEntries(
    (Object.keys(characterSheetSchema.shape.skills.shape) as SkillCategory[]).map((category) => {
      const names = Object.keys(characterSheetSchema.shape.skills.shape[category].shape) as SkillName[];
      const skillEntries = names.map((name) => [name, zeroSkill(`${category}/${name}` as SkillNameWithCategory)]);
      return [category, Object.fromEntries(skillEntries)];
    }),
  ) as CharacterSheet["skills"];

  const combatZero = Object.fromEntries(
    Object.keys(COMBAT_SKILL_HANDLING).map((skill) => {
      const name = skill as CombatSkillName;
      return [name, zeroCombatStats(name)];
    }),
  ) as Record<CombatSkillName, CombatStats>;

  return {
    generalInformation: {
      name: "",
      level: 1,
      levelUpProgress: levelUpProgressSchema.parse({}),
      sex: "",
      profession: { name: "", skill: "body/athletics" },
      hobby: { name: "", skill: "body/athletics" },
      birthday: "",
      birthplace: "",
      size: "",
      weight: "",
      hairColor: "",
      eyeColor: "",
      residence: "",
      appearance: "",
      specialCharacteristics: "",
    },
    calculationPoints: {
      adventurePoints: { start: 0, available: 0, total: 0 },
      attributePoints: { start: 0, available: 0, total: 0 },
    },
    advantages: [],
    disadvantages: [],
    specialAbilities: [],
    baseValues: {
      healthPoints: zeroBaseValue(),
      mentalHealth: zeroBaseValue(),
      armorLevel: zeroBaseValue(),
      naturalArmor: zeroBaseValue(),
      initiativeBaseValue: zeroBaseValue(),
      attackBaseValue: zeroBaseValue(),
      paradeBaseValue: zeroBaseValue(),
      rangedAttackBaseValue: zeroBaseValue(),
      luckPoints: zeroBaseValue(),
      bonusActionsPerCombatRound: zeroBaseValue(),
      legendaryActions: zeroBaseValue(),
    },
    attributes: {
      courage: zeroAttribute(),
      intelligence: zeroAttribute(),
      concentration: zeroAttribute(),
      charisma: zeroAttribute(),
      mentalResilience: zeroAttribute(),
      dexterity: zeroAttribute(),
      endurance: zeroAttribute(),
      strength: zeroAttribute(),
    },
    skills,
    combat: {
      melee: {
        martialArts: combatZero.martialArts,
        barehanded: combatZero.barehanded,
        chainWeapons: combatZero.chainWeapons,
        daggers: combatZero.daggers,
        slashingWeaponsSharp1h: combatZero.slashingWeaponsSharp1h,
        slashingWeaponsBlunt1h: combatZero.slashingWeaponsBlunt1h,
        thrustingWeapons1h: combatZero.thrustingWeapons1h,
        slashingWeaponsSharp2h: combatZero.slashingWeaponsSharp2h,
        slashingWeaponsBlunt2h: combatZero.slashingWeaponsBlunt2h,
        thrustingWeapons2h: combatZero.thrustingWeapons2h,
      },
      ranged: {
        missile: combatZero.missile,
        firearmSimple: combatZero.firearmSimple,
        firearmMedium: combatZero.firearmMedium,
        firearmComplex: combatZero.firearmComplex,
        heavyWeapons: combatZero.heavyWeapons,
      },
    },
  };
}

/**
 * Returns the start adventure points from the first adventure points entry in the history.
 * Assumes the first matching entry represents the initial AP allocation at character creation.
 */
export function getStartAdventurePoints(entries: HistoryEntry[]): number {
  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.type]));
    const name = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.name]));
    if (typeLabel === HISTORY_TYPE_CALCULATION_POINTS_EVENT && name === HISTORY_NAME_ADVENTURE_POINTS) {
      return toInt(entry[XML_CHARACTER_SHEET_KEYS.newCalculationPointsAvailable]);
    }
  }
  return DEFAULT_START_ADVENTURE_POINTS;
}

// Keep in sync with backend/src/core/rules/base-value-formulas.ts
export function calculateBaseValueByFormula(
  baseValueName: keyof BaseValues,
  attributes: Attributes,
): number | undefined {
  const attr = (name: keyof Attributes) => attributes[name].current + attributes[name].mod;

  switch (baseValueName) {
    case "healthPoints":
      return 2 * attr("endurance") + attr("strength") + 20;
    case "mentalHealth":
      return attr("courage") + 2 * attr("mentalResilience") + 8;
    case "initiativeBaseValue":
      return (2 * attr("courage") + attr("dexterity") + attr("endurance")) / 5;
    case "attackBaseValue":
      return (10 * (attr("courage") + attr("dexterity") + attr("strength"))) / 5;
    case "paradeBaseValue":
      return (10 * (attr("endurance") + attr("dexterity") + attr("strength"))) / 5;
    case "rangedAttackBaseValue":
      return (10 * (attr("concentration") + attr("dexterity") + attr("strength"))) / 5;
    case "legendaryActions":
      return 1;
    default:
      return undefined;
  }
}

export function mapAdvantages(advantages: string[], warnings: string[]): CharacterSheet["advantages"] {
  const result: CharacterSheet["advantages"] = [];
  for (const rawName of advantages) {
    const normalized = normalizeLabel(rawName);
    const enumValue = ADVANTAGE_MAP[normalized];
    if (enumValue === undefined) {
      warnings.push(`Unknown advantage '${rawName}', skipping`);
      continue;
    }
    const defaultEntry = ADVANTAGES.find(([name]) => name === enumValue);
    if (!defaultEntry) {
      warnings.push(`No default advantage cost found for '${rawName}', skipping`);
      continue;
    }
    const [, info, value] = defaultEntry;
    result.push([enumValue, info, value]);
  }
  return result;
}

export function mapDisadvantages(
  disadvantages: string[],
  characterName: string,
  warnings: string[],
): CharacterSheet["disadvantages"] {
  const result: CharacterSheet["disadvantages"] = [];
  const fearOfDetails = FEAR_OF_DETAIL_BY_CHARACTER_HASH[hashCharacterName(characterName)] ?? {};
  for (const rawName of disadvantages) {
    const normalized = normalizeLabel(rawName);
    const enumValue = DISADVANTAGE_MAP[normalized];
    if (enumValue === undefined) {
      warnings.push(`Unknown disadvantage '${rawName}', skipping`);
      continue;
    }

    let defaultEntry = DISADVANTAGES.find(([name]) => name === enumValue);
    if (enumValue === DisadvantagesNames.FEAR_OF) {
      const fearCost = FEAR_OF_COST_BY_LABEL[normalized];
      defaultEntry =
        DISADVANTAGES.find(([name, , value]) => name === enumValue && value === (fearCost ?? 5)) ?? defaultEntry;
    }

    if (!defaultEntry) {
      warnings.push(`No default disadvantage cost found for '${rawName}', skipping`);
      continue;
    }
    const [, info, value] = defaultEntry;
    let infoOverride = info;
    if (enumValue === DisadvantagesNames.FEAR_OF) {
      const detail = fearOfDetails[normalized];
      if (detail) {
        warnings.push(`Applying custom FEAR_OF detail override for '${characterName}': '${rawName}' -> '${detail}'`);
        infoOverride = detail;
      } else {
        infoOverride = rawName;
        warnings.push(
          `FEAR_OF disadvantage detected ('${rawName}'). Please manually enter the specific matter of fear in the resulting character JSON.`,
        );
      }
    }
    result.push([enumValue, infoOverride, value]);
  }
  return result;
}

export function mapGeneralInformationSkill(name: string): SkillNameWithCategory | null {
  if (!name) {
    return null;
  }
  if (name.includes("/")) {
    return name as SkillNameWithCategory;
  }
  const normalized = normalizeLabel(name);
  const nonCombat = NON_COMBAT_SKILL_MAP.get(normalized);
  if (nonCombat) {
    return nonCombat;
  }
  const combatSkill = COMBAT_SKILL_MAP[normalized];
  if (combatSkill) {
    return `combat/${combatSkill}` as SkillNameWithCategory;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function zeroCombatStats(name: CombatSkillName): CombatStats {
  const handling = COMBAT_SKILL_HANDLING[name];
  return {
    availablePoints: handling,
    handling,
    attackValue: 0,
    skilledAttackValue: 0,
    paradeValue: 0,
    skilledParadeValue: 0,
  };
}

function applyCalculationPoints(
  sheet: XmlCharacterSheet,
  characterSheet: CharacterSheet,
  spentOnSkills: number,
  spentOnCombatSkills: number,
): void {
  const calculationPoints = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.calculationPoints]);
  const attributePoints = asRecord(calculationPoints[XML_CHARACTER_SHEET_KEYS.attributePoints]);
  const attributeAdditional = toInt(attributePoints[XML_CHARACTER_SHEET_KEYS.additional]);
  const attributeSpent = toInt(attributePoints[XML_CHARACTER_SHEET_KEYS.spent]);
  characterSheet.calculationPoints.attributePoints = {
    start: ATTRIBUTE_POINTS_FOR_CREATION,
    available: ATTRIBUTE_POINTS_FOR_CREATION + attributeAdditional - attributeSpent,
    total: ATTRIBUTE_POINTS_FOR_CREATION + attributeAdditional,
  };

  const adventurePoints = asRecord(calculationPoints[XML_CHARACTER_SHEET_KEYS.adventurePoints]);
  const adventurePointsTotal = toInt(adventurePoints[XML_CHARACTER_SHEET_KEYS.total]);
  characterSheet.calculationPoints.adventurePoints = {
    start: 0, // Start points will be taken from history in a later step
    available: adventurePointsTotal - spentOnSkills - spentOnCombatSkills,
    total: adventurePointsTotal,
  };
}

function applyGeneralInformation(sheet: XmlCharacterSheet, characterSheet: CharacterSheet, warnings: string[]): void {
  const general = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.generalInformation]);
  characterSheet.generalInformation.name = asText(general[XML_CHARACTER_SHEET_KEYS.name]);
  characterSheet.generalInformation.sex = asText(general[XML_CHARACTER_SHEET_KEYS.sex]);
  characterSheet.generalInformation.level = toInt(sheet[XML_CHARACTER_SHEET_KEYS.level], 1);
  characterSheet.generalInformation.levelUpProgress = levelUpProgressSchema.parse({});
  characterSheet.generalInformation.birthday = asText(general[XML_CHARACTER_SHEET_KEYS.birthday]);
  characterSheet.generalInformation.birthplace = asText(general[XML_CHARACTER_SHEET_KEYS.birthplace]);
  characterSheet.generalInformation.size = asText(general[XML_CHARACTER_SHEET_KEYS.size]);
  characterSheet.generalInformation.weight = asText(general[XML_CHARACTER_SHEET_KEYS.weight]);
  characterSheet.generalInformation.hairColor = asText(general[XML_CHARACTER_SHEET_KEYS.hairColor]);
  characterSheet.generalInformation.eyeColor = asText(general[XML_CHARACTER_SHEET_KEYS.eyeColor]);
  characterSheet.generalInformation.residence = asText(general[XML_CHARACTER_SHEET_KEYS.residence]);
  characterSheet.generalInformation.appearance = asText(general[XML_CHARACTER_SHEET_KEYS.appearance]);

  const languagesNode = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.languagesScripts]);
  const languages = ensureArray(languagesNode[XML_CHARACTER_SHEET_KEYS.languageScript])
    .map((entry) => asText(entry))
    .filter(Boolean);
  const specialCharacteristics = asText(general[XML_CHARACTER_SHEET_KEYS.specialCharacteristics]);
  if (languages.length > 0) {
    queueInfoBlock("Info", [
      `Languages/Scripts entries dropped during conversion (not part of new schema): ${languages.join(", ")}`,
    ]);
  }
  characterSheet.generalInformation.specialCharacteristics = specialCharacteristics;

  const profession = asRecord(general[XML_CHARACTER_SHEET_KEYS.profession]);
  const professionName = asText(profession[XML_CHARACTER_SHEET_KEYS.name]);
  const professionSkillName = asText(profession[XML_CHARACTER_SHEET_KEYS.skill]);
  const professionSkill = mapGeneralInformationSkill(professionSkillName);
  if (!professionSkill) {
    warnings.push(
      `Unknown profession skill '${professionSkillName}', defaulting to ${DEFAULT_GENERAL_INFORMATION_SKILL}`,
    );
  }
  const resolvedProfessionSkill: SkillNameWithCategory = professionSkill ?? DEFAULT_GENERAL_INFORMATION_SKILL;
  characterSheet.generalInformation.profession = {
    name: professionName,
    skill: resolvedProfessionSkill,
  };
  applyProfessionOrHobbyBonus(characterSheet, resolvedProfessionSkill, PROFESSION_SKILL_BONUS, warnings);

  const hobby = asRecord(general[XML_CHARACTER_SHEET_KEYS.hobby]);
  const hobbyName = asText(hobby[XML_CHARACTER_SHEET_KEYS.name]);
  const hobbySkillName = asText(hobby[XML_CHARACTER_SHEET_KEYS.skill]);
  const normalizedHobbyName = normalizeLabel(hobbyName);
  const forcedHobbySkill = XML_HOBBY_NAME_TO_SKILL.get(normalizedHobbyName) ?? null;
  if (forcedHobbySkill) {
    warnings.push(
      `Hobby '${hobbyName}' was mapped to '${forcedHobbySkill}' from the hobby name because the XML can omit the corresponding hobby skill`,
    );
  }
  const hobbySkillFromXml = mapGeneralInformationSkill(hobbySkillName);
  if (!forcedHobbySkill && !hobbySkillFromXml && hobbySkillName) {
    warnings.push(`Unknown hobby skill '${hobbySkillName}', defaulting to ${DEFAULT_GENERAL_INFORMATION_SKILL}`);
  }
  const resolvedHobbySkill: SkillNameWithCategory =
    forcedHobbySkill ?? hobbySkillFromXml ?? DEFAULT_GENERAL_INFORMATION_SKILL;
  characterSheet.generalInformation.hobby = {
    name: hobbyName,
    skill: resolvedHobbySkill,
  };

  applyProfessionOrHobbyBonus(characterSheet, resolvedHobbySkill, HOBBY_SKILL_BONUS, warnings);
  queueInfoBlock("!! Notice !!", [
    "Profession/Hobby bonus for non-combat skills is now stored as the skill's mod value instead of being baked into the current value.",
    "Profession/Hobby bonus for combat skills is expected to already be stored in the mod value in the XML; please adjust manually if that's not the case.",
  ]);
}

function applyAdvantagesAndDisadvantages(
  sheet: XmlCharacterSheet,
  characterSheet: CharacterSheet,
  warnings: string[],
): void {
  const advantagesNode = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.advantages]);
  const advantages = ensureArray(advantagesNode[XML_CHARACTER_SHEET_KEYS.advantage])
    .map((name) => asText(name))
    .filter(Boolean);
  characterSheet.advantages = mapAdvantages(advantages, warnings);

  const disadvantagesNode = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.disadvantages]);
  const disadvantages = ensureArray(disadvantagesNode[XML_CHARACTER_SHEET_KEYS.disadvantage])
    .map((name) => asText(name))
    .filter(Boolean);
  characterSheet.disadvantages = mapDisadvantages(disadvantages, characterSheet.generalInformation.name, warnings);
}

function applyAttributes(sheet: XmlCharacterSheet, characterSheet: CharacterSheet, warnings: string[]): void {
  const attributes = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.attributes]);
  for (const [rawName, rawValue] of Object.entries(attributes)) {
    const normalizedName = normalizeLabel(rawName);
    const attributeKey = ATTRIBUTE_MAP[normalizedName] as keyof CharacterSheet["attributes"] | undefined;
    if (!attributeKey) {
      warnings.push(`Unknown attribute '${rawName}', skipping`);
      continue;
    }
    const value = rawValue as Record<string, unknown>;
    const start = toInt(value[XML_CHARACTER_SHEET_KEYS.start]);
    const current = toInt(value[XML_CHARACTER_SHEET_KEYS.current]);
    const mod = toInt(value[XML_CHARACTER_SHEET_KEYS.mod]);
    characterSheet.attributes[attributeKey] = {
      start,
      current,
      mod,
      totalCost: current,
    };
  }
}

function applyBaseValues(sheet: XmlCharacterSheet, characterSheet: CharacterSheet, warnings: string[]): void {
  const baseValues = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.baseValues]);
  const basePoints = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.basePoints]);

  for (const [rawName, rawValue] of Object.entries(baseValues)) {
    const normalizedName = normalizeLabel(rawName);
    const baseKey = BASE_VALUE_MAP[normalizedName] as keyof BaseValues | undefined;
    if (!baseKey) {
      warnings.push(`Unknown base value '${rawName}', skipping`);
      continue;
    }
    const value = rawValue as Record<string, unknown>;
    const mod = toInt(value[XML_CHARACTER_SHEET_KEYS.mod]);

    const points = asRecord(basePoints[rawName]);
    const start = toInt(points[XML_CHARACTER_SHEET_KEYS.start]);
    const bought = toInt(points[XML_CHARACTER_SHEET_KEYS.bought]);

    const baseValue: BaseValue = {
      start,
      current: start,
      mod,
    };

    if (bought !== 0) {
      baseValue.byLvlUp = bought;
      baseValue.current += bought;
    }

    characterSheet.baseValues[baseKey] = baseValue;
  }

  for (const baseValueName of Object.keys(characterSheet.baseValues) as (keyof BaseValues)[]) {
    const formulaValue = calculateBaseValueByFormula(baseValueName, characterSheet.attributes);
    if (formulaValue === undefined) {
      continue;
    }
    const rounded = Math.round(formulaValue);
    characterSheet.baseValues[baseValueName].byFormula = rounded;
    characterSheet.baseValues[baseValueName].current += rounded;
  }
}

function applyNonCombatSkills(sheet: XmlCharacterSheet, characterSheet: CharacterSheet, warnings: string[]): number {
  const skillsNode = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.skills]);
  delete (skillsNode as Record<string, unknown>)[XML_CHARACTER_SHEET_KEYS.activatedSkills];
  let spentTotal = 0;
  for (const [rawName, rawValue] of Object.entries(skillsNode)) {
    const normalizedName = normalizeLabel(rawName);
    const mappedSkill = mapNonCombatSkill(normalizedName);
    if (!mappedSkill) {
      warnings.push(`Unknown skill '${rawName}', skipping`);
      continue;
    }
    const { category, name } = splitSkill(mappedSkill);
    const value = rawValue as Record<string, unknown>;
    const activated =
      value[XML_CHARACTER_SHEET_KEYS.activated] !== undefined
        ? toInt(value[XML_CHARACTER_SHEET_KEYS.activated]) > 0
        : START_SKILLS.includes(mappedSkill);
    const totalCost = toInt(value[XML_CHARACTER_SHEET_KEYS.totalCosts]);
    spentTotal += totalCost;

    const skillCategory = getSkillCategorySection(characterSheet.skills, category);
    const existing = skillCategory[name];
    skillCategory[name] = {
      ...existing,
      activated: activated || existing.activated,
      start: existing.start + toInt(value[XML_CHARACTER_SHEET_KEYS.start]),
      current: existing.current + toInt(value[XML_CHARACTER_SHEET_KEYS.taw]),
      mod: existing.mod + toInt(value[XML_CHARACTER_SHEET_KEYS.mod]),
      totalCost: existing.totalCost + totalCost,
    };
  }
  return spentTotal;
}

function applyCombatSkills(sheet: XmlCharacterSheet, characterSheet: CharacterSheet, warnings: string[]): number {
  const combatSkillsNode = asRecord(sheet[XML_CHARACTER_SHEET_KEYS.combatSkills]);
  const baseValues = characterSheet.baseValues;

  const meleeNode = asRecord(combatSkillsNode[XML_CHARACTER_SHEET_KEYS.melee]);
  const rangedNode = asRecord(combatSkillsNode[XML_CHARACTER_SHEET_KEYS.ranged]);
  const meleeSkills = ensureArray(meleeNode[XML_CHARACTER_SHEET_KEYS.skill]) as Record<string, unknown>[];
  const rangedSkills = ensureArray(rangedNode[XML_CHARACTER_SHEET_KEYS.skill]) as Record<string, unknown>[];

  let spentTotal = 0;
  for (const skillEntry of meleeSkills) {
    spentTotal += applyCombatSkillEntry(skillEntry, "melee", characterSheet, baseValues, warnings);
  }

  for (const skillEntry of rangedSkills) {
    spentTotal += applyCombatSkillEntry(skillEntry, "ranged", characterSheet, baseValues, warnings);
  }

  for (const category of ["melee", "ranged"] as const) {
    const section = getCombatCategorySection(characterSheet.combat, category);
    for (const [skillName, stats] of Object.entries(section)) {
      section[skillName] = recalculateCombatStats(
        stats,
        category,
        characterSheet.skills.combat[skillName as CombatSkillName],
        baseValues,
      );
    }
  }

  return spentTotal;
}

function applyCombatSkillEntry(
  entry: Record<string, unknown>,
  category: CombatCategory,
  characterSheet: CharacterSheet,
  baseValues: BaseValues,
  warnings: string[],
): number {
  const name = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.name]));
  const combatSkillName = COMBAT_SKILL_MAP[name];
  if (!combatSkillName) {
    warnings.push(
      `Unknown combat skill '${name}', skipping. Please update COMBAT_SKILL_MAP in the script to include this entry`,
    );
    return 0;
  }

  const skill = characterSheet.skills.combat[combatSkillName];
  const current = toInt(entry[XML_CHARACTER_SHEET_KEYS.ability]);
  const mod = toInt(entry[XML_CHARACTER_SHEET_KEYS.mod]);
  const totalCost = toInt(entry[XML_CHARACTER_SHEET_KEYS.totalCosts]);
  characterSheet.skills.combat[combatSkillName] = {
    ...skill,
    activated: true,
    current,
    mod,
    totalCost,
  };

  const handling = toInt(entry[XML_CHARACTER_SHEET_KEYS.handling], COMBAT_SKILL_HANDLING[combatSkillName]);
  const skilledAttackValue =
    category === "melee"
      ? toInt(entry[XML_CHARACTER_SHEET_KEYS.atDistributed])
      : toInt(entry[XML_CHARACTER_SHEET_KEYS.fkDistributed]);
  const skilledParadeValue = category === "melee" ? toInt(entry[XML_CHARACTER_SHEET_KEYS.paDistributed]) : 0;

  const combatCategory = getCombatCategorySection(characterSheet.combat, category);
  const updatedCombatStats = recalculateCombatStats(
    {
      ...combatCategory[combatSkillName],
      handling,
      skilledAttackValue,
      skilledParadeValue,
    },
    category,
    characterSheet.skills.combat[combatSkillName],
    baseValues,
  );

  combatCategory[combatSkillName] = updatedCombatStats;
  return totalCost;
}

function applyProfessionOrHobbyBonus(
  characterSheet: CharacterSheet,
  skillName: SkillNameWithCategory,
  bonus: number,
  warnings: string[],
): void {
  const { category, name } = splitSkill(skillName);
  if (category === "combat") {
    // combat skills are expected to already have the bonus in the mod value
    return;
  }
  const skillsInCategory = getSkillCategorySection(characterSheet.skills, category);
  const skill = skillsInCategory[name];
  if (!skill) {
    warnings.push(`Unable to apply profession/hobby bonus for '${skillName}', skill not found in character sheet`);
    return;
  }
  // In the XML the bonus has been added to the current value, but in the new schema it is added to the mod value
  skill.mod += bonus;
  skill.current -= bonus;
}

function isGewuerfelteBegabungCombatSkillEntry(entry: HistoryEntry): boolean {
  const comment = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.comment]));
  if (!comment || comment !== GEWUERFELTE_BEGABUNG_COMMENT) {
    return false;
  }
  const typeLabel = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.type]));
  if (!COMBAT_SKILL_HISTORY_TYPE_LABELS.has(typeLabel)) {
    return false;
  }
  return getCombatSkillNameFromHistoryEntry(entry) !== null;
}

function getCombatSkillNameFromHistoryEntry(entry: HistoryEntry): CombatSkillName | null {
  const normalizedSkillName = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.name]));
  return COMBAT_SKILL_MAP[normalizedSkillName] ?? null;
}
