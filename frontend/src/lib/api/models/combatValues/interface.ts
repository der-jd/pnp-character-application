import { RecordEntry } from "../history/interface";
import type { CombatStats } from "api-spec";

export interface CombatValueIncreaseData {
  characterId: string;
  userId: string;
  combatCategory: string;
  combatSkillName: string;
  combatStats: {
    old: CombatStats;
    new: CombatStats;
  };
}

export interface CombatValueIncreaseReply {
  data: CombatValueIncreaseData;
  historyRecord?: RecordEntry;
}

export interface CombatValueIncreaseRequest {
  attackValue: {
    initialValue: number;
    increasedPoints: number;
  };
  paradeValue: {
    initialValue: number;
    increasedPoints: number;
  };
}
