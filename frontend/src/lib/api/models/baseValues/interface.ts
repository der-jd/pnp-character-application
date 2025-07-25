import { RecordEntry } from "../history/interface";
import { IncreaseBaseValue, PointsAvailable } from "../common/increase";
import { BaseValue } from "../Character/character";

export interface BaseValueIncreaseData {
  characterId: string;
  userId: string;
  baseValueName: string;
  changes: BaseValueChange;
  baseValuePoints: PointsAvailable;
}

export interface BaseValueChange {
  changes: {
    old: BaseValueState;
    new: BaseValueState;
  };
}

export interface BaseValueState {
  baseValue: BaseValue;
}

export interface BaseValueIncreaseReply {
  data: BaseValueIncreaseData;
  historyRecord?: RecordEntry;
}

export interface BaseValueIncreaseRequest {
  byLvlUp: IncreaseBaseValue;
}
