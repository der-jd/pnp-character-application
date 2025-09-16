import { RecordEntry } from "../history/interface";
import { IncreaseBaseValue, PointsAvailable } from "../common/increase";
import type { BaseValue } from "api-spec";

export interface BaseValueIncreaseData {
  characterId: string;
  userId: string;
  baseValueName: string;
  baseValue: {
    old: BaseValue;
    new: BaseValue;
  };
  baseValuePoints: PointsAvailable;
}

export interface BaseValueIncreaseReply {
  data: BaseValueIncreaseData;
  historyRecord?: RecordEntry;
}

export interface BaseValueIncreaseRequest {
  byLvlUp: IncreaseBaseValue;
}
