// Import types from api-spec instead of defining our own
import {
  PatchSkillRequest as SkillIncreaseRequest,
  PatchSkillPathParams,
  UpdateSkillResponse,
  LearningMethodString,
  InitialNew,
  InitialIncreased,
  CombatValues,
  Skill,
} from "api-spec";

import { RecordEntry } from "../history/interface";
import { PointsAvailable } from "../common/increase";

// Re-export api-spec types for convenience
export type {
  SkillIncreaseRequest,
  PatchSkillPathParams,
  UpdateSkillResponse,
  LearningMethodString,
  InitialNew,
  InitialIncreased,
};

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
