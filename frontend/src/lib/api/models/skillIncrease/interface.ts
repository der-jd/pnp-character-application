import { RecordEntry } from "../history/interface";

export interface SkillIncreaseData {
  characterId: string;
  skillName: string;
  skillValue: number;
  totalCost: number;
  availableAdventurePoints?: number;
  availableAttributePoints?: number;
}

export interface SkillIncreaseReply {
  data: SkillIncreaseData;
  historyRecord?: RecordEntry;
}

export interface SkillIncreaseRequest {
  initialValue: number;
  increasedPoints: number;
  learningMethod: string;
}
