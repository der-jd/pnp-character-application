export interface SkillIncreaseReply {
  characterId: string;
  skillName: string;
  skillValue: number;
  totalCost: number;
  availableAdventurePoints: number;
}

export interface SkillIncreaseRequest {
  initialValue: number;
  increasedPoints: number;
  learningMethod: string;
}
