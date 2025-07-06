/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BodyData {
  old: Record<string, any>;
  new: Record<string, any>;
}

export interface CalculationPointsChange {
  adjustment: number;
  old: number;
  new: number;
}

export interface Body {
  type: string;
  name: string;
  data: BodyData;
  learningMethod: string;
  calculationPointsChange: CalculationPointsChange;
  comment: string;
}

export interface NumberValue {
  value: number;
}

export interface StringValue {
  value: string;
}

export interface BooleanValue {
  value: boolean;
}

export interface RecordEntry extends Body {
  number: number;
  id: string;
  timestamp: string;
}

export interface HistoryBlock {
  characterId: string;
  blockNumber: number;
  blockId: string;
  previousBlockId: string | null;
  changes: RecordEntry[];
}

export interface Parameters {
  characterId: string;
  body: Body;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export interface HistoryReply {
  previousBlockNumber: number;
  previousBlockId: string;
  items: HistoryBlock[];
}
