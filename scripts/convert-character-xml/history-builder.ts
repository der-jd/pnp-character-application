import crypto from "node:crypto";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  type BaseValues,
  ATTRIBUTE_POINTS_FOR_CREATION,
  type CalculationPoints,
  type Character,
  type CharacterSheet,
  type CombatSkillName,
  DEFAULT_START_ADVENTURE_POINTS,
  type HistoryRecord,
  HistoryRecordType,
  type LearningMethodString,
  type SkillNameWithCategory,
  START_SKILLS,
  NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION,
  characterSheetSchema,
  historyBlockSchema,
} from "api-spec";
import type { HistoryEntry, CombatCategory, HistoryBlock } from "./types.js";
import { normalizeLabel, asText, toInt, toOptionalInt, toIsoTimestamp, queueInfoBlock } from "./xml-utils.js";
import {
  ADVANTAGE_CHANGED_TYPE,
  CALCULATION_POINTS_ATTRIBUTE_KEYWORDS,
  CREATION_COMMENT,
  DEFAULT_GENERAL_INFORMATION_SKILL,
  HISTORY_NAME_ADVENTURE_POINTS_KEYWORD,
  HISTORY_TYPE_ATTACK_DISTRIBUTED,
  HISTORY_TYPE_ATTRIBUTE_CHANGED,
  HISTORY_TYPE_BASE_VALUE_EVENT,
  HISTORY_TYPE_CALCULATION_POINTS_EVENT,
  HISTORY_TYPE_DISADVANTAGE_CHANGED,
  HISTORY_TYPE_HOBBY_CHANGED,
  HISTORY_TYPE_LEVEL_UP_EVENT,
  HISTORY_TYPE_PARADE_DISTRIBUTED,
  HISTORY_TYPE_PROFESSION_CHANGED,
  HISTORY_TYPE_SKILL_ACTIVATED,
  HISTORY_TYPE_SKILL_CHANGED,
  HISTORY_TYPE_COMBAT_SKILL_CHANGED,
  MAX_ITEM_SIZE,
  RULESET_VERSION,
  ATTRIBUTE_MAP,
  BASE_VALUE_MAP,
  COMBAT_SKILL_MAP,
  GEWUERFELTE_BEGABUNG_COMMENT,
  IGNORED_HISTORY_TYPES,
  IGNORED_HISTORY_TYPES_WITH_WARNING,
  SPECIAL_EVENT_COMMENT_KEYWORDS,
  SPECIAL_EXPERIENCE_COMMENT_PREFIX,
  XML_CHARACTER_SHEET_KEYS,
  XML_HOBBY_NAME_TO_SKILL,
  XML_LEARNING_METHOD_MAP,
} from "./constants.js";
import {
  recalculateCombatStats,
  mapNonCombatSkill,
  mapAdvantages,
  mapDisadvantages,
  mapGeneralInformationSkill,
  splitSkill,
  getSkillCategorySection,
  getCombatCategorySection,
  calculateGenerationPoints,
  calculateBaseValueByFormula,
  createEmptyCharacterSheet,
  getStartAdventurePoints,
} from "./sheet-builder.js";

// ---------------------------------------------------------------------------
// Phase 2 — Convert legacy XML history entries into new-schema history blocks.
//
// This phase is fully independent from Phase 1 (character conversion).
//
// Design decisions:
// - Legacy history entries are kept as-is and only mapped to the new schema
//   structure. No value normalization is applied (e.g. no subtraction of base
//   values or profession/hobby bonuses). The raw XML values are stored directly.
// - The CHARACTER_CREATED record is built from scratch using
//   createEmptyCharacterSheet() and replaying creation-date entries. Effects of
//   advantages, disadvantages, profession, and hobby (skill mods, bonuses) are
//   NOT applied — they appear in follow-up legacy records. This means the
//   creation sheet is intentionally incomplete compared to the new schema.
// - Level-up entries are not aggregated: the legacy "Level Up" event and its
//   associated "Basiswerte" change remain as two separate history records.
// - All legacy records are non-revertable. A RULESET_VERSION_UPDATED migration
//   record is appended in its own block to mark the boundary between legacy
//   and new history.
// - The authoritative character state is the one produced by Phase 1
//   (convertCharacter). The legacy history exists for visualization and audit
//   only — it does not need to be consistent with the final character sheet.
// ---------------------------------------------------------------------------

export function convertHistory(
  rawHistoryEntries: HistoryEntry[],
  userId: string,
  characterId: string,
  warnings: string[],
): HistoryBlock[] {
  const creationDate = getCreationDate(rawHistoryEntries);
  const { creationEntries, postCreationEntries } = partitionCreationEntries(rawHistoryEntries, creationDate, warnings);

  const activatedSkills = extractActivatedSkills(rawHistoryEntries, warnings);
  const creationTimestamp = getEarliestHistoryTimestamp(rawHistoryEntries);
  const creationRecord = buildCharacterCreatedRecord(
    userId,
    characterId,
    creationEntries,
    activatedSkills,
    creationTimestamp,
    warnings,
  );

  const creationCharacterSheet = (creationRecord.data.new as { character: Character }).character.characterSheet;

  const subsequentRecords = buildHistoryRecords(
    postCreationEntries,
    creationCharacterSheet,
    warnings,
    creationRecord.number + 1,
  );
  const records = [creationRecord, ...subsequentRecords];

  const historyBlocks = buildHistoryBlocks(records, characterId);

  // The migration record goes into its own dedicated history block so that
  // all blocks before it contain only legacy history. This makes it easy to
  // identify and re-import old history if needed.
  const migrationRecord = buildMigrationRecord(
    subsequentRecords.length > 0
      ? subsequentRecords[subsequentRecords.length - 1].number + 1
      : creationRecord.number + 1,
  );
  const lastBlock = historyBlocks[historyBlocks.length - 1];
  const migrationBlock: HistoryBlock = {
    characterId,
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

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function extractActivatedSkills(rawHistoryEntries: HistoryEntry[], warnings: string[]): SkillNameWithCategory[] {
  const creationDate = getCreationDate(rawHistoryEntries);
  const talentActivatedType = HISTORY_TYPE_SKILL_ACTIVATED;

  const seen = new Set<SkillNameWithCategory>();
  const activatedSkills: SkillNameWithCategory[] = [];

  for (const entry of rawHistoryEntries) {
    const typeLabel = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.type]));
    if (typeLabel !== talentActivatedType) {
      continue;
    }

    const date = asText(entry[XML_CHARACTER_SHEET_KEYS.date]);
    if (creationDate !== null && date !== creationDate) {
      continue;
    }

    const comment = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.comment]));
    if (comment.toLowerCase().startsWith(SPECIAL_EXPERIENCE_COMMENT_PREFIX)) {
      continue;
    }

    // Skills activated automatically by advantages (e.g. Abitur from Studium) are not player choices
    if (
      comment.toLowerCase().includes(SPECIAL_EVENT_COMMENT_KEYWORDS.studium) ||
      comment.toLowerCase().includes(SPECIAL_EVENT_COMMENT_KEYWORDS.abitur)
    ) {
      continue;
    }

    const label = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.name]));
    if (!label) {
      continue;
    }

    let mapped: SkillNameWithCategory | null;
    if (isInternalSkillName(label)) {
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

  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.type]));
    if (IGNORED_HISTORY_TYPES.has(typeLabel)) {
      if (IGNORED_HISTORY_TYPES_WITH_WARNING.has(typeLabel)) {
        queueInfoBlock("Info", [
          `History entry type '${typeLabel}' ignored during conversion (not part of new schema)`,
        ]);
      }
      continue;
    }

    const name = asText(entry[XML_CHARACTER_SHEET_KEYS.name]);
    const oldValueText = asText(entry[XML_CHARACTER_SHEET_KEYS.oldValue]);
    const newValueText = asText(entry[XML_CHARACTER_SHEET_KEYS.newValue]);
    const increaseMode = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.increaseMode]));
    const comment = asText(entry[XML_CHARACTER_SHEET_KEYS.comment]) || null;

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
      timestamp: toIsoTimestamp(asText(entry[XML_CHARACTER_SHEET_KEYS.date])),
    };

    switch (recordType) {
      case HistoryRecordType.CALCULATION_POINTS_CHANGED:
        fillCalculationPointsRecord(record, entry, name, apTracker, attrTracker, warnings);
        break;
      case HistoryRecordType.BASE_VALUE_CHANGED:
        fillBaseValueRecord(record, name, oldValueText, newValueText, characterSheet, warnings);
        break;
      case HistoryRecordType.LEVEL_UP_APPLIED:
        fillLevelUpRecord(record, oldValueText, newValueText);
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
  userId: string,
  characterId: string,
  creationEntries: HistoryEntry[],
  activatedSkills: SkillNameWithCategory[],
  timestamp: string,
  warnings: string[],
): HistoryRecord {
  const creationCharacter = buildCreationCharacter(userId, characterId, creationEntries, warnings);

  return {
    type: HistoryRecordType.CHARACTER_CREATED,
    name: "Character Created",
    number: 1,
    id: crypto.randomUUID(),
    data: {
      new: {
        character: creationCharacter,
        generationPoints: calculateGenerationPoints(creationCharacter.characterSheet),
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

function buildMigrationRecord(number: number): HistoryRecord {
  return {
    type: HistoryRecordType.RULESET_VERSION_UPDATED,
    name: "Migration from legacy character tool",
    number,
    id: crypto.randomUUID(),
    data: {
      old: { value: "0.0.0" },
      new: { value: RULESET_VERSION },
    },
    learningMethod: null,
    calculationPoints: {
      adventurePoints: null,
      attributePoints: null,
    },
    comment:
      "Character migrated from legacy XML format. History records before this point may reference old skill names or rules. This record and all records before it cannot be reverted.",
    timestamp: new Date().toISOString(),
  };
}

function buildCreationCharacter(
  userId: string,
  characterId: string,
  creationEntries: HistoryEntry[],
  warnings: string[],
): Character {
  return {
    userId,
    characterId,
    characterSheet: buildCreationCharacterSheet(creationEntries, warnings),
    rulesetVersion: RULESET_VERSION,
  };
}

function buildCreationCharacterSheet(creationEntries: HistoryEntry[], warnings: string[]): CharacterSheet {
  const sheet = createEmptyCharacterSheet();

  // Set default calculation points (AP may be overridden by a creation entry)
  const startAP = getStartAdventurePoints(creationEntries);
  sheet.calculationPoints = {
    adventurePoints: { start: startAP, available: startAP, total: startAP },
    attributePoints: {
      start: ATTRIBUTE_POINTS_FOR_CREATION,
      available: ATTRIBUTE_POINTS_FOR_CREATION,
      total: ATTRIBUTE_POINTS_FOR_CREATION,
    },
  };

  // Apply all creation entries. Effects of advantages, disadvantages, profession, and
  // hobby (skill mods, bonuses, skill/combat skill changes) are not applied — they are
  // part of follow-up legacy history records. This means the creation sheet is incomplete
  // compared to the new schema, which is accepted for non-revertable legacy data.
  for (const entry of creationEntries) {
    applyCreationEntry(sheet, entry, warnings);
  }

  // Calculate base values from creation attributes by formula
  recalculateCreationBaseValues(sheet);

  return sheet;
}

function applyCreationEntry(characterSheet: CharacterSheet, entry: HistoryEntry, warnings: string[]): void {
  const typeLabel = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.type]));
  const rawName = asText(entry[XML_CHARACTER_SHEET_KEYS.name]);
  const normalizedName = normalizeLabel(rawName);
  const newValueText = asText(entry[XML_CHARACTER_SHEET_KEYS.newValue]);
  const comment = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.comment]));

  switch (typeLabel) {
    case HISTORY_TYPE_CALCULATION_POINTS_EVENT: {
      if (comment === CREATION_COMMENT) {
        const available = toInt(
          entry[XML_CHARACTER_SHEET_KEYS.newCalculationPointsAvailable],
          DEFAULT_START_ADVENTURE_POINTS,
        );
        characterSheet.calculationPoints.adventurePoints = {
          start: available,
          available,
          total: available,
        };
      }
      return;
    }
    case HISTORY_TYPE_ATTRIBUTE_CHANGED: {
      const attributeName = ATTRIBUTE_MAP[normalizedName] as keyof CharacterSheet["attributes"] | undefined;
      if (!attributeName) {
        warnings.push(`Unknown attribute history name '${rawName}' in creation replay, skipping`);
        return;
      }
      const current = toInt(newValueText);
      characterSheet.attributes[attributeName] = {
        ...characterSheet.attributes[attributeName],
        start: current,
        current,
        totalCost: current,
      };
      characterSheet.calculationPoints.attributePoints.available -= 1;
      return;
    }
    case HISTORY_TYPE_SKILL_ACTIVATED: {
      const mappedSkill = mapHistoryNonCombatSkill(rawName);
      if (!mappedSkill) {
        warnings.push(`Unknown activated skill '${rawName}' in creation replay, skipping`);
        return;
      }
      const { category, name } = splitSkill(mappedSkill);
      const section = getSkillCategorySection(characterSheet.skills, category);
      section[name] = {
        ...section[name],
        activated: true,
      };
      return;
    }
    case HISTORY_TYPE_PROFESSION_CHANGED: {
      const professionSkill = mapGeneralInformationSkill(newValueText);
      if (!professionSkill) {
        warnings.push(
          `Unknown profession skill '${newValueText}' in creation, defaulting to ${DEFAULT_GENERAL_INFORMATION_SKILL}`,
        );
      }
      characterSheet.generalInformation.profession = {
        name: rawName,
        skill: professionSkill ?? DEFAULT_GENERAL_INFORMATION_SKILL,
      };
      return;
    }
    case HISTORY_TYPE_HOBBY_CHANGED: {
      const normalizedHobbyName = normalizeLabel(rawName);
      const forcedHobbySkill = XML_HOBBY_NAME_TO_SKILL.get(normalizedHobbyName) ?? null;
      const hobbySkillFromEntry = mapGeneralInformationSkill(newValueText);
      if (!forcedHobbySkill && !hobbySkillFromEntry && newValueText) {
        warnings.push(
          `Unknown hobby skill '${newValueText}' in creation, defaulting to ${DEFAULT_GENERAL_INFORMATION_SKILL}`,
        );
      }
      characterSheet.generalInformation.hobby = {
        name: rawName,
        skill: forcedHobbySkill ?? hobbySkillFromEntry ?? DEFAULT_GENERAL_INFORMATION_SKILL,
      };
      return;
    }
    case ADVANTAGE_CHANGED_TYPE: {
      const mapped = mapAdvantages([newValueText], warnings);
      characterSheet.advantages.push(...mapped);
      return;
    }
    case HISTORY_TYPE_DISADVANTAGE_CHANGED: {
      const mapped = mapDisadvantages([newValueText], "", warnings);
      characterSheet.disadvantages.push(...mapped);
      return;
    }
    default:
      warnings.push(`Unhandled creation entry type '${typeLabel}' for '${rawName}', skipping`);
      return;
  }
}

function recalculateCreationBaseValues(characterSheet: CharacterSheet): void {
  for (const baseValueName of Object.keys(characterSheet.baseValues) as (keyof BaseValues)[]) {
    const bv = characterSheet.baseValues[baseValueName];
    const formulaValue = calculateBaseValueByFormula(baseValueName, characterSheet.attributes);
    if (formulaValue === undefined) {
      continue;
    }

    const rounded = Math.round(formulaValue);
    bv.byFormula = rounded;
    bv.current = rounded;
  }
}

function mapHistoryNonCombatSkill(name: string): SkillNameWithCategory | null {
  const normalizedName = normalizeLabel(name);
  if (isInternalSkillName(normalizedName)) {
    return normalizedName as SkillNameWithCategory;
  }
  return mapNonCombatSkill(normalizedName);
}

function isInternalSkillName(name: string): boolean {
  if (!name.includes("/")) {
    return false;
  }

  const [category] = name.split("/");
  return category in characterSheetSchema.shape.skills.shape;
}

function fillCalculationPointsRecord(
  record: HistoryRecord,
  entry: HistoryEntry,
  name: string,
  apTracker: { start: number; runningTotal: number },
  attrTracker: { start: number; runningTotal: number },
  warnings: string[],
): void {
  const oldAvailable = toInt(entry[XML_CHARACTER_SHEET_KEYS.oldCalculationPointsAvailable]);
  const newAvailable = toInt(entry[XML_CHARACTER_SHEET_KEYS.newCalculationPointsAvailable]);
  const change = newAvailable - oldAvailable;

  const normalizedName = normalizeLabel(name).toLowerCase();
  const isAttributePoints = CALCULATION_POINTS_ATTRIBUTE_KEYWORDS.some((keyword) => normalizedName.includes(keyword));
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

  if (
    !isAttributePoints &&
    !normalizeLabel(name).toLowerCase().includes(HISTORY_NAME_ADVENTURE_POINTS_KEYWORD.toLowerCase())
  ) {
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

function fillLevelUpRecord(record: HistoryRecord, oldValueText: string, newValueText: string): void {
  record.data.old = { level: toInt(oldValueText) };
  record.data.new = { level: toInt(newValueText) };
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

  const isAttackDistribution = normalizeLabel(typeLabel) === HISTORY_TYPE_ATTACK_DISTRIBUTED;
  const isParadeDistribution = normalizeLabel(typeLabel) === HISTORY_TYPE_PARADE_DISTRIBUTED;

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
  if (normalizedType === ADVANTAGE_CHANGED_TYPE) {
    value = `Advantage: ${value}`;
  } else if (normalizedType === HISTORY_TYPE_DISADVANTAGE_CHANGED) {
    value = `Disadvantage: ${value}`;
  } else if (normalizedType === HISTORY_TYPE_PROFESSION_CHANGED) {
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
    case HISTORY_TYPE_CALCULATION_POINTS_EVENT:
      return HistoryRecordType.CALCULATION_POINTS_CHANGED;
    case HISTORY_TYPE_BASE_VALUE_EVENT:
      return HistoryRecordType.BASE_VALUE_CHANGED;
    case HISTORY_TYPE_LEVEL_UP_EVENT:
      return HistoryRecordType.LEVEL_UP_APPLIED;
    case HISTORY_TYPE_ATTRIBUTE_CHANGED:
      return HistoryRecordType.ATTRIBUTE_CHANGED;
    case HISTORY_TYPE_SKILL_CHANGED:
    case HISTORY_TYPE_COMBAT_SKILL_CHANGED:
    case HISTORY_TYPE_SKILL_ACTIVATED:
      return HistoryRecordType.SKILL_CHANGED;
    case HISTORY_TYPE_ATTACK_DISTRIBUTED:
    case HISTORY_TYPE_PARADE_DISTRIBUTED:
      return HistoryRecordType.COMBAT_STATS_CHANGED;
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
  const mapped = XML_LEARNING_METHOD_MAP[normalized] ?? null;
  if (!mapped) {
    warnings.push(`Unknown learning method '${value}', setting to null`);
  }
  return mapped;
}

// The first history entry's date is assumed to be the character creation date.
function getCreationDate(entries: HistoryEntry[]): string | null {
  if (entries.length === 0) {
    return null;
  }
  return asText(entries[0][XML_CHARACTER_SHEET_KEYS.date]) || null;
}

function getEarliestHistoryTimestamp(entries: HistoryEntry[]): string {
  let earliest: string | null = null;
  for (const entry of entries) {
    const rawDate = asText(entry[XML_CHARACTER_SHEET_KEYS.date]);
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
  const typeLabel = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.type]));
  const comment = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.comment]));
  const date = asText(entry[XML_CHARACTER_SHEET_KEYS.date]);
  const isOnCreationDate = creationDate !== null && date === creationDate;

  // Vorteil/Nachteil geändert are always creation; error if post-creation
  if (typeLabel === ADVANTAGE_CHANGED_TYPE || typeLabel === HISTORY_TYPE_DISADVANTAGE_CHANGED) {
    if (!isOnCreationDate) {
      warnings.push(
        `ERROR: '${asText(entry[XML_CHARACTER_SHEET_KEYS.type])}' entry found after creation date (${date}): '${asText(entry[XML_CHARACTER_SHEET_KEYS.newValue])}'. ` +
          `These entries must only appear during character creation.`,
      );
    }
    return true;
  }

  // Beruf/Hobby geändert are always creation
  if (typeLabel === HISTORY_TYPE_PROFESSION_CHANGED || typeLabel === HISTORY_TYPE_HOBBY_CHANGED) {
    return true;
  }

  // Everything below requires being on the creation date
  if (!isOnCreationDate) {
    return false;
  }

  // Initial AP grant (comment "Erstellung")
  if (typeLabel === HISTORY_TYPE_CALCULATION_POINTS_EVENT && comment === CREATION_COMMENT) {
    return true;
  }

  // Initial attribute allocation
  if (typeLabel === HISTORY_TYPE_ATTRIBUTE_CHANGED) {
    return true;
  }

  // Talent activations that are NOT special experiences (SE:)
  if (typeLabel === HISTORY_TYPE_SKILL_ACTIVATED) {
    return !comment.toLowerCase().startsWith(SPECIAL_EXPERIENCE_COMMENT_PREFIX);
  }

  return false;
}

/**
 * Partitions history entries into creation vs post-creation. Classification is
 * by entry type and comment, NOT purely by date, because gameplay entries can
 * also occur on the creation date.
 *
 * Assumptions:
 * - "Talent gesteigert" / "Kampftalent gesteigert" on the creation date are
 *   normal history records (skill/combat skill changes are post-creation).
 * - "Eigenschaft gesteigert" on the creation date is always initial attribute
 *   allocation (no gameplay attribute increases on day one).
 * - "Talent aktiviert" on the creation date is an initial activation unless the
 *   comment starts with "SE:" (Sonderereignis / special event).
 * - "AT/FK verteilt" / "PA verteilt" are always normal history records, even
 *   on the creation date (combat stat distribution is a post-creation action).
 * - "Vorteil geändert" / "Nachteil geändert" are always creation entries; if
 *   they appear after the creation date, a warning is emitted.
 */
function partitionCreationEntries(
  entries: HistoryEntry[],
  creationDate: string | null,
  warnings: string[],
): { creationEntries: HistoryEntry[]; postCreationEntries: HistoryEntry[] } {
  const creationEntries: HistoryEntry[] = [];
  const postCreationEntries: HistoryEntry[] = [];

  for (const entry of entries) {
    if (isCreationEntry(entry, creationDate, warnings)) {
      creationEntries.push(entry);
    } else {
      postCreationEntries.push(entry);
    }
  }

  if (creationEntries.length > 0) {
    queueInfoBlock("Info", [`${creationEntries.length} history entries absorbed into CHARACTER_CREATED record`]);
  }

  return { creationEntries, postCreationEntries };
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
