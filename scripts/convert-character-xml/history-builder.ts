import crypto from "node:crypto";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  type BaseValues,
  type CalculationPoints,
  type Character,
  type CharacterSheet,
  type CombatSkillName,
  type CombatStats,
  type EffectByLevelUp,
  type HistoryRecord,
  HistoryRecordType,
  type LearningMethodString,
  type Skill,
  type SkillNameWithCategory,
  START_SKILLS,
  NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION,
  characterSheetSchema,
  historyBlockSchema,
  levelUpProgressSchema,
} from "api-spec";
import type { XmlCharacterSheet, HistoryEntry, CombatCategory, HistoryBlock, AggregatedSkillModState } from "./types.js";
import {
  normalizeLabel,
  asText,
  asRecord,
  toInt,
  toOptionalInt,
  toIsoTimestamp,
  queueInfoBlock,
} from "./xml-utils.js";
import {
  MAX_ITEM_SIZE,
  ATTRIBUTE_MAP,
  BASE_VALUE_MAP,
  NON_COMBAT_SKILL_MAP,
  COMBAT_SKILL_MAP,
  GEWUERFELTE_BEGABUNG_COMMENT,
  COMBAT_SKILL_HISTORY_TYPE_LABELS,
  IGNORED_HISTORY_TYPES,
  IGNORED_HISTORY_TYPES_WITH_WARNING,
  LEVEL_UP_COMMENT_PATTERN,
  BASE_VALUE_TO_LEVEL_UP_EFFECT,
} from "./constants.js";
import {
  recalculateCombatStats,
  mapNonCombatSkill,
  splitSkill,
  getSkillCategorySection,
  getCombatCategorySection,
  extractLevelUpEffects,
  buildLevelUpProgressFromEffects,
  calculateGenerationPoints,
} from "./character-builder.js";

// ---------------------------------------------------------------------------
// Phase 2 — Build the history blocks from the XML history and Phase 1 output.
// ---------------------------------------------------------------------------

export function convertHistory(
  rawHistoryEntries: HistoryEntry[],
  character: Character,
  warnings: string[],
): HistoryBlock[] {
  const { characterSheet } = character;
  const historyEntries = aggregateCombatSkillModEntries(rawHistoryEntries, warnings);
  const levelUpEffects = extractLevelUpEffects(historyEntries);

  const creationDate = getCreationDate(rawHistoryEntries);
  const postCreationEntries = filterCreationEntries(historyEntries, creationDate, warnings);

  const activatedSkills = extractActivatedSkills(rawHistoryEntries, warnings);
  const creationTimestamp = getEarliestHistoryTimestamp(rawHistoryEntries);
  const creationRecord = buildCharacterCreatedRecord(characterSheet, activatedSkills, creationTimestamp);
  const subsequentRecords = buildHistoryRecords(
    postCreationEntries,
    characterSheet,
    warnings,
    levelUpEffects,
    creationRecord.number + 1,
  );
  const records = [creationRecord, ...subsequentRecords];

  const historyBlocks = buildHistoryBlocks(records, character.characterId);

  // The migration record goes into its own dedicated history block so that
  // all blocks before it contain only legacy history. This makes it easy to
  // identify and re-import old history if needed.
  const migrationRecord = buildMigrationRecord(
    characterSheet,
    subsequentRecords.length > 0
      ? subsequentRecords[subsequentRecords.length - 1].number + 1
      : creationRecord.number + 1,
  );
  const lastBlock = historyBlocks[historyBlocks.length - 1];
  const migrationBlock: HistoryBlock = {
    characterId: character.characterId,
    blockNumber: lastBlock ? lastBlock.blockNumber + 1 : 1,
    blockId: crypto.randomUUID(),
    previousBlockId: lastBlock ? lastBlock.blockId : null,
    changes: [migrationRecord],
  };
  historyBlocks.push(migrationBlock);

  for (const block of historyBlocks) {
    historyBlockSchema.parse(block);
  }

  return historyBlocks;
}

function extractActivatedSkills(rawHistoryEntries: HistoryEntry[], warnings: string[]): SkillNameWithCategory[] {
  const creationDate = getCreationDate(rawHistoryEntries);
  const talentActivatedType = normalizeLabel("Talent aktiviert");

  const seen = new Set<SkillNameWithCategory>();
  const activatedSkills: SkillNameWithCategory[] = [];

  for (const entry of rawHistoryEntries) {
    const typeLabel = normalizeLabel(asText(entry.type));
    if (typeLabel !== talentActivatedType) {
      continue;
    }

    const date = asText(entry.date);
    if (creationDate !== null && date !== creationDate) {
      continue;
    }

    const comment = normalizeLabel(asText(entry.comment));
    if (comment.toLowerCase().startsWith("se:")) {
      continue;
    }

    // Skills activated automatically by advantages (e.g. Abitur from Studium) are not player choices
    if (comment.toLowerCase().includes("studium") || comment.toLowerCase().includes("abitur")) {
      continue;
    }

    const label = normalizeLabel(asText(entry.name));
    if (!label) {
      continue;
    }

    let mapped: SkillNameWithCategory | null = null;
    if (label.includes("/")) {
      mapped = label as SkillNameWithCategory;
    } else {
      mapped = mapNonCombatSkill(label) ?? null;
    }

    if (!mapped) {
      warnings.push(`Unknown activated skill '${label}', skipping`);
      continue;
    }

    if (seen.has(mapped)) {
      continue;
    }

    seen.add(mapped);
    activatedSkills.push(mapped);
  }

  if (activatedSkills.length > NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION) {
    warnings.push(
      `Activated skills exceed maximum (${NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION}), truncating additional entries`,
    );
    return activatedSkills.slice(0, NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION);
  }

  for (const fallback of START_SKILLS) {
    if (activatedSkills.length >= NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION) {
      break;
    }
    if (seen.has(fallback)) {
      continue;
    }
    seen.add(fallback);
    activatedSkills.push(fallback);
  }

  while (activatedSkills.length < NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION) {
    const defaultSkill = START_SKILLS[0] ?? ("body/athletics" as SkillNameWithCategory);
    warnings.push("Activated skills list shorter than required, filling with default skill");
    activatedSkills.push(defaultSkill);
  }

  return activatedSkills;
}

function buildHistoryRecords(
  entries: HistoryEntry[],
  characterSheet: CharacterSheet,
  warnings: string[],
  levelUpEffects: Record<string, EffectByLevelUp>,
  startingNumber = 1,
): HistoryRecord[] {
  const records: HistoryRecord[] = [];
  let number = startingNumber;

  const apTracker = {
    start: characterSheet.calculationPoints.adventurePoints.start,
    runningTotal: characterSheet.calculationPoints.adventurePoints.start,
  };
  const attrTracker = {
    start: characterSheet.calculationPoints.attributePoints.start,
    runningTotal: characterSheet.calculationPoints.attributePoints.start,
  };

  // Running level-up progress state, built incrementally as level-up records are processed
  const runningLevelUpEffects: Record<string, EffectByLevelUp> = {};

  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry.type));
    if (IGNORED_HISTORY_TYPES.has(typeLabel)) {
      if (IGNORED_HISTORY_TYPES_WITH_WARNING.has(typeLabel)) {
        queueInfoBlock("Info", [
          `History entry type '${typeLabel}' ignored during conversion (not part of new schema)`,
        ]);
      }
      continue;
    }

    // Skip base value entries that belong to level-ups (they are absorbed into the LEVEL_UP_APPLIED record)
    if (isLevelUpBaseValueEntry(entry)) {
      continue;
    }

    const name = asText(entry.name);
    const oldValueText = asText(entry.old_value);
    const newValueText = asText(entry.new_value);
    const increaseMode = normalizeLabel(asText(entry.increase_mode));
    const comment = asText(entry.comment) || null;

    const recordType = mapRecordType(typeLabel, warnings);
    const learningMethod = mapLearningMethod(increaseMode, warnings);

    const record: HistoryRecord = {
      type: recordType,
      name,
      number,
      id: crypto.randomUUID(),
      data: {
        new: {},
      },
      learningMethod,
      calculationPoints: {
        adventurePoints: null,
        attributePoints: null,
      },
      comment,
      timestamp: toIsoTimestamp(asText(entry.date)),
    };

    switch (recordType) {
      case HistoryRecordType.CALCULATION_POINTS_CHANGED:
        fillCalculationPointsRecord(record, entry, name, apTracker, attrTracker, warnings);
        break;
      case HistoryRecordType.BASE_VALUE_CHANGED:
        fillBaseValueRecord(record, name, oldValueText, newValueText, characterSheet, warnings);
        break;
      case HistoryRecordType.LEVEL_UP_APPLIED:
        fillLevelUpRecord(record, oldValueText, newValueText, levelUpEffects, runningLevelUpEffects);
        break;
      case HistoryRecordType.ATTRIBUTE_CHANGED:
        fillAttributeRecord(record, name, oldValueText, newValueText, characterSheet, warnings);
        break;
      case HistoryRecordType.SKILL_CHANGED:
        fillSkillRecord(record, name, oldValueText, newValueText, comment, characterSheet, warnings);
        break;
      case HistoryRecordType.COMBAT_STATS_CHANGED:
        fillCombatStatsRecord(record, typeLabel, name, oldValueText, newValueText, characterSheet, warnings);
        break;
      case HistoryRecordType.SPECIAL_ABILITIES_CHANGED:
        fillSpecialAbilityRecord(record, typeLabel, name, oldValueText, newValueText);
        break;
      default:
        warnings.push(`Unhandled record type '${typeLabel}', leaving data empty`);
        break;
    }

    records.push(record);
    number += 1;
  }

  return records;
}

function buildCharacterCreatedRecord(
  characterSheet: CharacterSheet,
  activatedSkills: SkillNameWithCategory[],
  timestamp: string,
): HistoryRecord {
  const startAP = characterSheet.calculationPoints.adventurePoints.start;
  const startAttr = characterSheet.calculationPoints.attributePoints.start;

  const creationCharacterSheet: CharacterSheet = {
    ...characterSheet,
    generalInformation: {
      ...characterSheet.generalInformation,
      level: 1,
      levelUpProgress: levelUpProgressSchema.parse({}),
    },
    calculationPoints: {
      adventurePoints: { start: startAP, available: startAP, total: startAP },
      attributePoints: { start: startAttr, available: 0, total: startAttr },
    },
  };

  return {
    type: HistoryRecordType.CHARACTER_CREATED,
    name: characterSheet.generalInformation.name || "Character Created",
    number: 1,
    id: crypto.randomUUID(),
    data: {
      new: {
        character: creationCharacterSheet,
        generationPoints: calculateGenerationPoints(characterSheet),
        activatedSkills,
      },
    },
    learningMethod: null,
    calculationPoints: {
      adventurePoints: null,
      attributePoints: null,
    },
    comment: null,
    timestamp,
  };
}

function buildMigrationRecord(characterSheet: CharacterSheet, number: number): HistoryRecord {
  return {
    type: HistoryRecordType.RULESET_VERSION_UPDATED,
    name: "Migration from legacy character tool",
    number,
    id: crypto.randomUUID(),
    data: {
      new: {
        character: characterSheet,
        rulesetVersion: "1.1.1",
      },
    },
    learningMethod: null,
    calculationPoints: {
      adventurePoints: null,
      attributePoints: null,
    },
    comment:
      "Character migrated from legacy XML format. History records before this point may reference old skill names or rules.",
    timestamp: new Date().toISOString(),
  };
}

function fillCalculationPointsRecord(
  record: HistoryRecord,
  entry: HistoryEntry,
  name: string,
  apTracker: { start: number; runningTotal: number },
  attrTracker: { start: number; runningTotal: number },
  warnings: string[],
): void {
  const oldAvailable = toInt(entry.old_calculation_points_available);
  const newAvailable = toInt(entry.new_calculation_points_available);
  const change = newAvailable - oldAvailable;

  const normalizedName = normalizeLabel(name).toLowerCase();
  const isAttributePoints = normalizedName.includes("attribut") || normalizedName.includes("eigenschaft");
  const key = isAttributePoints ? "attributePoints" : "adventurePoints";

  const tracker = isAttributePoints ? attrTracker : apTracker;
  const oldTotal = tracker.runningTotal;
  tracker.runningTotal += change;
  const newTotal = tracker.runningTotal;

  const oldPoints: CalculationPoints = { start: tracker.start, available: oldAvailable, total: oldTotal };
  const newPoints: CalculationPoints = { start: tracker.start, available: newAvailable, total: newTotal };

  record.data.old = { [key]: oldPoints };
  record.data.new = { [key]: newPoints };
  record.calculationPoints = {
    adventurePoints: key === "adventurePoints" ? { old: oldPoints, new: newPoints } : null,
    attributePoints: key === "attributePoints" ? { old: oldPoints, new: newPoints } : null,
  };

  if (!isAttributePoints && !normalizeLabel(name).toLowerCase().includes("abenteuer")) {
    warnings.push(`Calculation points entry '${name}' assumed to be adventure points`);
  }
}

function fillBaseValueRecord(
  record: HistoryRecord,
  name: string,
  oldValueText: string,
  newValueText: string,
  characterSheet: CharacterSheet,
  warnings: string[],
): void {
  const key = BASE_VALUE_MAP[normalizeLabel(name)] as keyof BaseValues | undefined;
  if (!key) {
    warnings.push(`Unknown base value history name '${name}', storing raw values`);
    record.data.new = { value: newValueText };
    if (oldValueText) {
      record.data.old = { value: oldValueText };
    }
    return;
  }

  const baseValue = characterSheet.baseValues[key];
  const oldValue = { ...baseValue, current: toInt(oldValueText) };
  const newValue = { ...baseValue, current: toInt(newValueText) };

  record.data.old = { baseValue: oldValue };
  record.data.new = { baseValue: newValue };
}

function fillLevelUpRecord(
  record: HistoryRecord,
  oldValueText: string,
  newValueText: string,
  levelUpEffects: Record<string, EffectByLevelUp>,
  runningLevelUpEffects: Record<string, EffectByLevelUp>,
): void {
  const oldLevel = toInt(oldValueText);
  const newLevel = toInt(newValueText);

  // Build the old progress from the current running state (before this level-up)
  const oldProgress = buildLevelUpProgressFromEffects({ ...runningLevelUpEffects });

  // Add the effect for the new level to the running state
  const newLevelKey = String(newLevel);
  if (newLevelKey in levelUpEffects) {
    runningLevelUpEffects[newLevelKey] = levelUpEffects[newLevelKey];
  }

  // Build the new progress from the updated running state (after this level-up)
  const newProgress = buildLevelUpProgressFromEffects({ ...runningLevelUpEffects });

  record.data.old = { level: oldLevel, levelUpProgress: oldProgress };
  record.data.new = { level: newLevel, levelUpProgress: newProgress };
}

function fillAttributeRecord(
  record: HistoryRecord,
  name: string,
  oldValueText: string,
  newValueText: string,
  characterSheet: CharacterSheet,
  warnings: string[],
): void {
  const key = ATTRIBUTE_MAP[normalizeLabel(name)] as keyof CharacterSheet["attributes"] | undefined;
  if (!key) {
    warnings.push(`Unknown attribute history name '${name}', storing raw values`);
    record.data.new = { value: newValueText };
    if (oldValueText) {
      record.data.old = { value: oldValueText };
    }
    return;
  }

  const baseAttribute = characterSheet.attributes[key];
  const oldAttribute = { ...baseAttribute, current: toInt(oldValueText) };
  const newAttribute = { ...baseAttribute, current: toInt(newValueText) };

  record.data.old = { attribute: oldAttribute };
  record.data.new = { attribute: newAttribute };
}

function fillSkillRecord(
  record: HistoryRecord,
  name: string,
  oldValueText: string,
  newValueText: string,
  comment: string | null,
  characterSheet: CharacterSheet,
  warnings: string[],
): void {
  const normalizedName = normalizeLabel(name);
  const mappedNonCombat = mapNonCombatSkill(normalizedName);
  const mappedCombat = COMBAT_SKILL_MAP[normalizedName];
  const normalizedComment = comment ? normalizeLabel(comment) : "";

  if (mappedCombat && normalizedComment === GEWUERFELTE_BEGABUNG_COMMENT) {
    const skill = characterSheet.skills.combat[mappedCombat];
    const oldMod = toOptionalInt(oldValueText);
    const newMod = toOptionalInt(newValueText);

    if (oldMod === null || newMod === null) {
      warnings.push(`Missing mod values for Gewürfelte Begabung history entry '${name}', storing raw values`);
    } else {
      record.data.old = { skill: { ...skill, mod: oldMod } };
      record.data.new = { skill: { ...skill, mod: newMod } };
      return;
    }
  }

  if (mappedCombat) {
    const skill = characterSheet.skills.combat[mappedCombat];
    record.data.old = { skill: { ...skill, current: toInt(oldValueText) } };
    record.data.new = { skill: { ...skill, current: toInt(newValueText) } };
    return;
  }

  if (mappedNonCombat) {
    const { category, name: skillName } = splitSkill(mappedNonCombat);
    const skillCategory = getSkillCategorySection(characterSheet.skills, category);
    const skill = skillCategory[skillName];
    record.data.old = { skill: { ...skill, current: toInt(oldValueText) } };
    record.data.new = { skill: { ...skill, current: toInt(newValueText) } };
    return;
  }

  warnings.push(`Unknown skill history name '${name}', storing raw values`);
  record.data.new = { value: newValueText };
  if (oldValueText) {
    record.data.old = { value: oldValueText };
  }
}

function fillCombatStatsRecord(
  record: HistoryRecord,
  typeLabel: string,
  name: string,
  oldValueText: string,
  newValueText: string,
  characterSheet: CharacterSheet,
  warnings: string[],
): void {
  const combatSkillName = COMBAT_SKILL_MAP[normalizeLabel(name)];
  if (!combatSkillName) {
    warnings.push(`Unknown combat stats history name '${name}', storing raw values`);
    record.data.new = { value: newValueText };
    if (oldValueText) {
      record.data.old = { value: oldValueText };
    }
    return;
  }

  const category = getCombatCategory(combatSkillName);
  const combatCategory = getCombatCategorySection(characterSheet.combat, category);
  const baseStats = combatCategory[combatSkillName];
  const skill = characterSheet.skills.combat[combatSkillName];

  const isAttackDistribution = normalizeLabel(typeLabel) === normalizeLabel("AT/FK verteilt");
  const isParadeDistribution = normalizeLabel(typeLabel) === normalizeLabel("PA verteilt");

  if (!isAttackDistribution && !isParadeDistribution) {
    warnings.push(`Unknown combat stats distribution type '${typeLabel}' for '${name}'`);
  }

  const oldAttack = isAttackDistribution ? toInt(oldValueText) : baseStats.skilledAttackValue;
  const newAttack = isAttackDistribution ? toInt(newValueText) : baseStats.skilledAttackValue;
  const oldParade = isParadeDistribution ? toInt(oldValueText) : baseStats.skilledParadeValue;
  const newParade = isParadeDistribution ? toInt(newValueText) : baseStats.skilledParadeValue;

  const oldStats = recalculateCombatStats(
    {
      ...baseStats,
      skilledAttackValue: oldAttack,
      skilledParadeValue: category === "melee" ? oldParade : 0,
    },
    category,
    skill,
    characterSheet.baseValues,
  );

  const newStats = recalculateCombatStats(
    {
      ...baseStats,
      skilledAttackValue: newAttack,
      skilledParadeValue: category === "melee" ? newParade : 0,
    },
    category,
    skill,
    characterSheet.baseValues,
  );

  record.data.old = oldStats;
  record.data.new = newStats;
}

function fillSpecialAbilityRecord(
  record: HistoryRecord,
  typeLabel: string,
  name: string,
  oldValueText: string,
  newValueText: string,
): void {
  const normalizedType = normalizeLabel(typeLabel);
  let value = newValueText || name;
  if (normalizedType === normalizeLabel("Vorteil ge\u00e4ndert")) {
    value = `Advantage: ${value}`;
  } else if (normalizedType === normalizeLabel("Nachteil ge\u00e4ndert")) {
    value = `Disadvantage: ${value}`;
  } else if (normalizedType === normalizeLabel("Beruf ge\u00e4ndert")) {
    value = `Profession: ${name} / ${newValueText}`;
  }

  record.data.new = { values: [value] };
  if (oldValueText) {
    record.data.old = { values: [oldValueText] };
  }
}

function mapRecordType(typeLabel: string, warnings: string[]): HistoryRecordType {
  const normalized = normalizeLabel(typeLabel);
  switch (normalized) {
    case normalizeLabel("Ereignis (Berechnungspunkte)"):
      return HistoryRecordType.CALCULATION_POINTS_CHANGED;
    case normalizeLabel("Ereignis (Basiswerte)"):
      return HistoryRecordType.BASE_VALUE_CHANGED;
    case normalizeLabel("Ereignis (Level Up)"):
      return HistoryRecordType.LEVEL_UP_APPLIED;
    case normalizeLabel("Eigenschaft gesteigert"):
      return HistoryRecordType.ATTRIBUTE_CHANGED;
    case normalizeLabel("Talent gesteigert"):
      return HistoryRecordType.SKILL_CHANGED;
    case normalizeLabel("Kampftalent gesteigert"):
      return HistoryRecordType.SKILL_CHANGED;
    case normalizeLabel("Talent aktiviert"):
      return HistoryRecordType.SKILL_CHANGED;
    case normalizeLabel("AT/FK verteilt"):
      return HistoryRecordType.COMBAT_STATS_CHANGED;
    case normalizeLabel("PA verteilt"):
      return HistoryRecordType.COMBAT_STATS_CHANGED;
    case normalizeLabel("Vorteil ge\u00e4ndert"):
    case normalizeLabel("Nachteil ge\u00e4ndert"):
    case normalizeLabel("Beruf ge\u00e4ndert"):
    case normalizeLabel("Hobby ge\u00e4ndert"):
      // Creation-date entries of these types are filtered out before reaching
      // buildHistoryRecords(). Any post-creation entries are kept as
      // SPECIAL_ABILITIES_CHANGED records.
      return HistoryRecordType.SPECIAL_ABILITIES_CHANGED;
    default:
      warnings.push(`Unknown history entry type '${typeLabel}', defaulting to SPECIAL_ABILITIES_CHANGED`);
      return HistoryRecordType.SPECIAL_ABILITIES_CHANGED;
  }
}

function mapLearningMethod(value: string, warnings: string[]): LearningMethodString | null {
  const normalized = normalizeLabel(value).toLowerCase();
  if (!normalized) {
    return null;
  }
  switch (normalized) {
    case normalizeLabel("G\u00fcnstig").toLowerCase():
      return "LOW_PRICED";
    case normalizeLabel("Normal").toLowerCase():
      return "NORMAL";
    case normalizeLabel("Teuer").toLowerCase():
      return "EXPENSIVE";
    case normalizeLabel("Frei").toLowerCase():
      return "FREE";
    default:
      warnings.push(`Unknown learning method '${value}', setting to null`);
      return null;
  }
}

/**
 * Returns true if this "Ereignis (Basiswerte)" entry belongs to a level-up
 * (has "Level X" in the comment and maps to a known level-up effect).
 */
function isLevelUpBaseValueEntry(entry: HistoryEntry): boolean {
  const typeLabel = normalizeLabel(asText(entry.type));
  if (typeLabel !== normalizeLabel("Ereignis (Basiswerte)")) {
    return false;
  }
  const comment = asText(entry.comment);
  const levelMatch = comment.match(LEVEL_UP_COMMENT_PATTERN);
  if (!levelMatch) {
    return false;
  }
  const effectKind = BASE_VALUE_TO_LEVEL_UP_EFFECT[normalizeLabel(asText(entry.name))];
  return !!effectKind;
}

function aggregateCombatSkillModEntries(entries: HistoryEntry[], warnings: string[]): HistoryEntry[] {
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
    const parsedOld = toOptionalInt(entry.old_value);
    const parsedNew = toOptionalInt(entry.new_value);
    const displayName = asText(entry.name);
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
    const fallbackOldValue = asText(state.firstEntry.old_value);
    const fallbackNewValue = asText(state.lastEntry.new_value);
    if (state.oldValue === null || state.newValue === null) {
      warnings.push(
        `Incomplete Gewürfelte Begabung history data for combat skill '${state.displayName}', using available values`,
      );
    }
    const replacement: HistoryEntry = {
      ...state.firstEntry,
      old_value: state.oldValue !== null ? state.oldValue.toString() : fallbackOldValue,
      new_value: state.newValue !== null ? state.newValue.toString() : fallbackNewValue,
      date: state.lastEntry.date ?? state.firstEntry.date,
      name: state.firstEntry.name ?? state.displayName,
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

function isGewuerfelteBegabungCombatSkillEntry(entry: HistoryEntry): boolean {
  const comment = normalizeLabel(asText(entry.comment));
  if (!comment || comment !== GEWUERFELTE_BEGABUNG_COMMENT) {
    return false;
  }
  const typeLabel = normalizeLabel(asText(entry.type));
  if (!COMBAT_SKILL_HISTORY_TYPE_LABELS.has(typeLabel)) {
    return false;
  }
  return getCombatSkillNameFromHistoryEntry(entry) !== null;
}

function getCombatSkillNameFromHistoryEntry(entry: HistoryEntry): CombatSkillName | null {
  const normalizedSkillName = normalizeLabel(asText(entry.name));
  return COMBAT_SKILL_MAP[normalizedSkillName] ?? null;
}

// The first history entry's date is assumed to be the character creation date.
// Creation entries are identified by type and comment, NOT purely by date,
// because gameplay entries can also occur on the creation date.
//
// Assumptions:
// - "Talent gesteigert" / "Kampftalent gesteigert" on the creation date are
//   normal history records UNLESS the comment indicates otherwise (e.g.
//   "Gewürfelte Begabung" / "Begabung").
// - "Eigenschaft gesteigert" on the creation date is always initial attribute
//   allocation (no gameplay attribute increases on day one).
// - "Talent aktiviert" on the creation date is an initial activation unless the
//   comment starts with "SE:" (Sonderereignis / special event).
// - "AT/FK verteilt" / "PA verteilt" are always normal history records, even
//   on the creation date (combat stat distribution is a post-creation action).
// - "Vorteil geändert" / "Nachteil geändert" are always creation entries; if
//   they appear after the creation date, an error is emitted.
function getCreationDate(entries: HistoryEntry[]): string | null {
  if (entries.length === 0) {
    return null;
  }
  return asText(entries[0].date) || null;
}

function getEarliestHistoryTimestamp(entries: HistoryEntry[]): string {
  let earliest: string | null = null;
  for (const entry of entries) {
    const rawDate = asText(entry.date);
    if (!rawDate) {
      continue;
    }
    const iso = toIsoTimestamp(rawDate);
    if (!earliest || iso < earliest) {
      earliest = iso;
    }
  }
  return earliest ?? new Date().toISOString();
}

function isCreationEntry(entry: HistoryEntry, creationDate: string | null, warnings: string[]): boolean {
  const typeLabel = normalizeLabel(asText(entry.type));
  const comment = normalizeLabel(asText(entry.comment));
  const date = asText(entry.date);
  const isOnCreationDate = creationDate !== null && date === creationDate;

  // Vorteil/Nachteil geändert are always creation; error if post-creation
  if (typeLabel === normalizeLabel("Vorteil geändert") || typeLabel === normalizeLabel("Nachteil geändert")) {
    if (!isOnCreationDate) {
      warnings.push(
        `ERROR: '${asText(entry.type)}' entry found after creation date (${date}): '${asText(entry.new_value)}'. ` +
          `These entries must only appear during character creation.`,
      );
    }
    return true;
  }

  // Beruf/Hobby geändert are always creation
  if (typeLabel === normalizeLabel("Beruf geändert") || typeLabel === normalizeLabel("Hobby geändert")) {
    return true;
  }

  // Everything below requires being on the creation date
  if (!isOnCreationDate) {
    return false;
  }

  // Initial AP grant (comment "Erstellung")
  if (typeLabel === normalizeLabel("Ereignis (Berechnungspunkte)") && comment === normalizeLabel("Erstellung")) {
    return true;
  }

  // Initial attribute allocation
  if (typeLabel === normalizeLabel("Eigenschaft gesteigert")) {
    return true;
  }

  // Talent activations that are NOT special events (SE:)
  if (typeLabel === normalizeLabel("Talent aktiviert")) {
    return !comment.toLowerCase().startsWith("se:");
  }

  // Initial combat skill values: comment contains "Begabung" (matches
  // "Gewürfelte Begabung", "Begabung", and variants)
  if (comment.toLowerCase().includes("begabung")) {
    return true;
  }

  return false;
}

function filterCreationEntries(
  entries: HistoryEntry[],
  creationDate: string | null,
  warnings: string[],
): HistoryEntry[] {
  const filtered: HistoryEntry[] = [];
  let skipped = 0;

  for (const entry of entries) {
    if (isCreationEntry(entry, creationDate, warnings)) {
      skipped += 1;
    } else {
      filtered.push(entry);
    }
  }

  if (skipped > 0) {
    queueInfoBlock("Info", [`${skipped} history entries absorbed into CHARACTER_CREATED record`]);
  }

  return filtered;
}

function getCombatCategory(skill: CombatSkillName): CombatCategory {
  const meleeSkills = Object.keys(characterSheetSchema.shape.combat.shape.melee.shape);
  return meleeSkills.includes(skill) ? "melee" : "ranged";
}

function buildHistoryBlocks(records: HistoryRecord[], characterId: string): HistoryBlock[] {
  const blocks: HistoryBlock[] = [];

  let blockNumber = 1;
  let previousBlockId: string | null = null;
  let currentBlock = createHistoryBlock(characterId, blockNumber, previousBlockId);

  for (const record of records) {
    const testBlock = {
      ...currentBlock,
      changes: [...currentBlock.changes, record],
    };

    if (estimateItemSize(testBlock) > MAX_ITEM_SIZE && currentBlock.changes.length > 0) {
      blocks.push(currentBlock);
      previousBlockId = currentBlock.blockId;
      blockNumber += 1;
      currentBlock = createHistoryBlock(characterId, blockNumber, previousBlockId);
    }

    currentBlock.changes.push(record);

    if (estimateItemSize(currentBlock) > MAX_ITEM_SIZE) {
      console.warn(`History record ${record.number} exceeds MAX_ITEM_SIZE (${MAX_ITEM_SIZE} bytes) when stored alone.`);
    }
  }

  if (currentBlock.changes.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function createHistoryBlock(characterId: string, blockNumber: number, previousBlockId: string | null) {
  return {
    characterId,
    blockNumber,
    blockId: crypto.randomUUID(),
    previousBlockId,
    changes: [] as HistoryRecord[],
  };
}

function estimateItemSize(item: unknown): number {
  const marshalled = marshall(item as Record<string, unknown>);
  const json = JSON.stringify(marshalled);
  return Buffer.byteLength(json, "utf8");
}
