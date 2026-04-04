import { AdvantagesNames, type Character, type CharacterSheet, characterSchema } from "api-spec";
import type { XmlCharacterSheet, HistoryEntry } from "./types.js";
import { normalizeLabel, asText, toInt, queueInfoBlock } from "./xml-utils.js";
import { ADVANTAGE_CHANGED_TYPE, STUDIUM_NAME } from "./constants.js";
import {
  buildCharacterSheet,
  extractLevelUpEffects,
  buildLevelUpProgressFromEffects,
  aggregateCombatSkillModEntries,
  mapNonCombatSkill,
} from "./sheet-builder.js";
import backendPackage from "../../backend/package.json";

const RULESET_VERSION = backendPackage.version;

// ---------------------------------------------------------------------------
// Phase 1 — Build the character JSON from the XML sheet and history metadata.
// ---------------------------------------------------------------------------

export function convertCharacter(
  sheet: XmlCharacterSheet,
  rawHistoryEntries: HistoryEntry[],
  userId: string,
  characterId: string,
): { character: Character; warnings: string[] } {
  const { characterSheet, warnings } = buildCharacterSheet(sheet);

  const collegeSkillName = extractCollegeSkillName(rawHistoryEntries);
  patchCollegeEducationSkillName(characterSheet, collegeSkillName, warnings);

  const historyEntries = aggregateCombatSkillModEntries(rawHistoryEntries, []);

  const startAP = getStartAdventurePoints(rawHistoryEntries);
  characterSheet.calculationPoints.adventurePoints.start = startAP;

  const lastAPFromHistory = getLastAdventurePointsAvailable(rawHistoryEntries);
  const computedAP = characterSheet.calculationPoints.adventurePoints.available;
  if (lastAPFromHistory !== null && lastAPFromHistory !== computedAP) {
    warnings.push(
      `Adventure points mismatch: computed from totalCost = ${computedAP}, last history entry = ${lastAPFromHistory}`,
    );
  }

  const levelUpEffects = extractLevelUpEffects(historyEntries);
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
    const typeLabel = normalizeLabel(asText(entry.type));
    if (typeLabel !== ADVANTAGE_CHANGED_TYPE) {
      continue;
    }
    const newValue = normalizeLabel(asText(entry.new_value));
    if (newValue !== STUDIUM_NAME) {
      continue;
    }
    const comment = asText(entry.comment).trim();
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
  queueInfoBlock("!! Notice !!", [
    `COLLEGE_EDUCATION for ${mappedSkillName}: added ${additionalBonus} to skill mod value and subtracted ${additionalBonus} from skill current value. In the new schema, the bonus is stored as mod value instead of being baked into the current value.`,
  ]);
}

function getStartAdventurePoints(entries: HistoryEntry[]): number {
  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry.type));
    const comment = normalizeLabel(asText(entry.comment));
    if (typeLabel === normalizeLabel("Ereignis (Berechnungspunkte)") && comment === normalizeLabel("Erstellung")) {
      return toInt(entry.new_calculation_points_available);
    }
  }
  return 0;
}

function getLastAdventurePointsAvailable(entries: HistoryEntry[]): number | null {
  let lastAvailable: number | null = null;
  for (const entry of entries) {
    const typeLabel = normalizeLabel(asText(entry.type));
    const name = normalizeLabel(asText(entry.name)).toLowerCase();
    const isAPEvent = typeLabel === normalizeLabel("Ereignis (Berechnungspunkte)") && name.includes("abenteuer");
    const isSkillIncrease =
      typeLabel === normalizeLabel("Talent gesteigert") || typeLabel === normalizeLabel("Kampftalent gesteigert");
    if (!isAPEvent && !isSkillIncrease) continue;
    const change = toInt(entry.calculation_points_change);
    if (change === 0) continue;
    lastAvailable = toInt(entry.new_calculation_points_available);
  }
  return lastAvailable;
}
