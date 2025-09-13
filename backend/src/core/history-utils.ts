import { RecordType } from "api-spec";

export function parseRecordType(type: string): RecordType {
  return RecordType[type.toUpperCase() as keyof typeof RecordType];
}
