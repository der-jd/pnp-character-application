import type { CombatSection, HistoryRecord } from "api-spec";

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
