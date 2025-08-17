import { RecordEntry } from "../history/interface";
import { CombatValues } from "../Character/character";

export interface CombatValueIncreaseData {
  characterId: string;
  userId: string;
  combatCategory: string;
  combatSkillName: string;
  combatValues: {
    old: CombatValues;
    new: CombatValues;
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
