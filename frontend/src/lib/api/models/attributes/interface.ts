import { RecordEntry } from "../history/interface";
import { Increase, PointsAvailable } from "../common/increase";
import { Attribute } from "../Character/character";

export interface AttributeIncreaseData {
  characterId: string;
  userId: string;
  attributeName: string;
  changes: AttributeChange;
  attributePoints: PointsAvailable;
}

export interface AttributeChange {
  changes: {
    old: AttributeState;
    new: AttributeState;
  };
}

export interface AttributeState {
  attribute: Attribute;
}

export interface AttributeIncreaseReply {
  data: AttributeIncreaseData;
  historyRecord?: RecordEntry;
}

export interface AttributeIncreaseRequest {
  current: Increase;
}
