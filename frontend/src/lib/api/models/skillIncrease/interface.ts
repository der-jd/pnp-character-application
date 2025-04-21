import { RecordEntry } from "../history/interface";

export interface SkillIncreaseReply {
  characterId: string;
  skillName: string;
  skillValue: number;
  totalCost: number;
  availableAdventurePoints?: number;
  availableAttributePoints?: number;
  historyRecord?: RecordEntry;
}

export interface SkillIncreaseRequest {
  initialValue: number;
  increasedPoints: number;
  learningMethod: string;
}
