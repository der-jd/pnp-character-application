// Import types from api-spec instead of defining our own
import {
  PatchAttributeRequest as AttributeIncreaseRequest,
  PatchAttributePathParams,
  UpdateAttributeResponse,
  InitialNew,
  InitialIncreased,
  Attribute,
} from "api-spec";

import { RecordEntry } from "../history/interface";
import { PointsAvailable } from "../common/increase";

// Re-export api-spec types for convenience
export type {
  AttributeIncreaseRequest,
  PatchAttributePathParams,
  UpdateAttributeResponse,
  InitialNew,
  InitialIncreased,
};

export interface AttributeIncreaseData {
  characterId: string;
  userId: string;
  attributeName: string;
  changes: {
    old: AttributeState;
    new: AttributeState;
  };
  attributePoints: PointsAvailable;
}

export interface AttributeState {
  attribute: Attribute;
}

export interface AttributeIncreaseReply {
  data: AttributeIncreaseData;
  historyRecord?: RecordEntry;
}
