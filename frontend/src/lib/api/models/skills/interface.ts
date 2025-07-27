import { RecordEntry } from "../history/interface";
import { Increase, PointsAvailable } from "../common/increase";
import { CombatValues, Skill } from "../Character/character";

export interface SkillIncreaseData {
  characterId: string;
  userId: string;
  skillCategory: string;
  skillName: string;
  changes: {
    old: SkillState;
    new: SkillState;
  };
  adventurePoints: PointsAvailable;
}

export interface SkillState {
  skill: Skill;
  combatValues?: CombatValues;
}

export interface SkillIncreaseReply {
  data: SkillIncreaseData;
  historyRecord?: RecordEntry;
}

export interface SkillIncreaseRequest {
  current: Increase;
  learningMethod: string;
}
