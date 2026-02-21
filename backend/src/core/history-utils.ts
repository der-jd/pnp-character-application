import { HistoryRecordType } from "api-spec";

export function parseRecordType(type: string): HistoryRecordType {
  return HistoryRecordType[type.toUpperCase() as keyof typeof HistoryRecordType];
}
