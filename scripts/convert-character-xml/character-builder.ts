import { AdvantagesNames, type Character, type CharacterSheet, characterSchema } from "api-spec";
import type { XmlCharacterSheet, HistoryEntry } from "./types.js";
import { normalizeLabel, asText, toInt, queueInfoBlock } from "./xml-utils.js";
import {
  ADVANTAGE_CHANGED_TYPE,
  HISTORY_SKILL_INCREASE_TYPE_LABELS,
  HISTORY_NAME_ADVENTURE_POINTS_KEYWORD,
  HISTORY_TYPE_CALCULATION_POINTS_EVENT,
  RULESET_VERSION,
  STUDIUM_NAME,
  XML_CHARACTER_SHEET_KEYS,
} from "./constants.js";
import {
  buildCharacterSheet,
  extractLevelUpEffects,
  buildLevelUpProgressFromEffects,
  getStartAdventurePoints,
  mapNonCombatSkill,
} from "./sheet-builder.js";

/**
 * Phase 1 — Build the authoritative character JSON from the XML sheet.
 *
 * This is the source of truth for the converted character. The character sheet
 * is built from the full XML state (not from history replay), so it reflects
 * the final, current state of the character. History entries are only used for
 * metadata that isn't part of the XML sheet itself (e.g. start adventure
 * points, college education skill name, level-up effects).
 *
 * Phase 1 is independent from Phase 2 (history conversion). The character
 * produced here must be 100% aligned with the new schema.
 */
export function convertCharacter(
  sheet: XmlCharacterSheet,
  rawHistoryEntries: HistoryEntry[],
  userId: string,
  characterId: string,
): { character: Character; warnings: string[] } {
  const { characterSheet, warnings } = buildCharacterSheet(sheet);

  // Update character sheet with college skill name from history (if corresponding advantage is selected)
  const collegeSkillName = extractCollegeSkillName(rawHistoryEntries);
  patchCollegeEducationSkillName(characterSheet, collegeSkillName, warnings);

  const startAP = getStartAdventurePoints(rawHistoryEntries);
  characterSheet.calculationPoints.adventurePoints.start = startAP;

  const lastAPFromHistory = getLastAdventurePointsAvailable(rawHistoryEntries);
  const computedAP = characterSheet.calculationPoints.adventurePoints.available;
  if (lastAPFromHistory !== null && lastAPFromHistory !== computedAP) {
    warnings.push(
      `Adventure points mismatch: computed from totalCost = ${computedAP}, last history entry = ${lastAPFromHistory}`,
    );
  }

  const levelUpEffects = extractLevelUpEffects(rawHistoryEntries);
  characterSheet.generalInformation.levelUpProgress = buildLevelUpProgressFromEffects(levelUpEffects);

  const character: Character = {
    userId,
    characterId,
    characterSheet,
    rulesetVersion: RULESET_VERSION,
  };

  characterSchema.parse(character);

  return { character, warnings };
}

// ---------------------------------------------------------------------------
// Private helpers (character-phase only)
// ---------------------------------------------------------------------------

function extractCollegeSkillName(entries: HistoryEntry[]): string | null {
  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.type]));
    if (typeLabel !== ADVANTAGE_CHANGED_TYPE) {
      continue;
    }
    const newValue = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.newValue]));
    if (newValue !== STUDIUM_NAME) {
      continue;
    }
    const comment = asText(entry[XML_CHARACTER_SHEET_KEYS.comment]).trim();
    if (comment) {
      return comment;
    }
  }
  return null;
}

function patchCollegeEducationSkillName(
  characterSheet: CharacterSheet,
  collegeSkillName: string | null,
  warnings: string[],
): void {
  const index = characterSheet.advantages.findIndex(([name]) => name === AdvantagesNames.COLLEGE_EDUCATION);
  if (index === -1) {
    return;
  }
  if (!collegeSkillName) {
    warnings.push(
      `COLLEGE_EDUCATION advantage detected but no skill name found in history. Please manually enter the skill name in the resulting character JSON.`,
    );
    return;
  }
  const mappedSkill = mapNonCombatSkill(collegeSkillName);
  const mappedSkillName = mappedSkill?.startsWith("knowledge/") ? mappedSkill.replace("knowledge/", "") : null;
  if (!mappedSkillName) {
    warnings.push(
      `COLLEGE_EDUCATION: unknown knowledge skill '${collegeSkillName}', using raw value. Please manually correct the skill name in the resulting character JSON.`,
    );
  }
  const [enumValue, , value] = characterSheet.advantages[index];
  characterSheet.advantages[index] = [enumValue, mappedSkillName ?? collegeSkillName, value];

  // In the XML the COLLEGE_EDUCATION bonus is baked into the current value,
  // but in the new schema it is stored as mod. Subtract the bonus from current
  // so that current + mod stays the same as the original XML value.
  const additionalBonus = 20;
  if (mappedSkillName && mappedSkillName in characterSheet.skills.knowledge) {
    const chosenSkill = characterSheet.skills.knowledge[mappedSkillName as keyof CharacterSheet["skills"]["knowledge"]];
    chosenSkill.mod += additionalBonus;
    chosenSkill.current -= additionalBonus;
  }
  queueInfoBlock("Info", [
    `COLLEGE_EDUCATION for ${mappedSkillName}: added ${additionalBonus} to skill mod value and subtracted ${additionalBonus} from skill current value. In the new schema, the bonus is stored as mod value instead of being baked into the current value.`,
  ]);
}

function getLastAdventurePointsAvailable(entries: HistoryEntry[]): number | null {
  let lastAvailable: number | null = null;
  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.type]));
    const name = normalizeLabel(asText(entry[XML_CHARACTER_SHEET_KEYS.name]));
    const isAPEvent =
      typeLabel === HISTORY_TYPE_CALCULATION_POINTS_EVENT &&
      name.toLowerCase().includes(HISTORY_NAME_ADVENTURE_POINTS_KEYWORD.toLowerCase());
    const isSkillIncrease = HISTORY_SKILL_INCREASE_TYPE_LABELS.has(typeLabel);
    if (!isAPEvent && !isSkillIncrease) continue;
    const change = toInt(entry[XML_CHARACTER_SHEET_KEYS.calculationPointsChange]);
    if (change === 0) continue;
    lastAvailable = toInt(entry[XML_CHARACTER_SHEET_KEYS.newCalculationPointsAvailable]);
  }
  return lastAvailable;
}
