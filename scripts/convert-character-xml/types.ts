import type { CombatSection, CombatSkillName, HistoryRecord } from "api-spec";

export type XmlCharacterSheet = Record<string, unknown>;
export type HistoryEntry = Record<string, unknown>;
export type CombatCategory = keyof CombatSection;

export type HistoryBlock = {
  blockNumber: number;
  blockId: string;
  previousBlockId: string | null;
  characterId: string;
  changes: HistoryRecord[];
};

export type AggregatedSkillModState = {
  combatSkillName: CombatSkillName;
  firstIndex: number;
  firstEntry: HistoryEntry;
  lastEntry: HistoryEntry;
  oldValue: number | null;
  newValue: number | null;
  displayName: string;
};
