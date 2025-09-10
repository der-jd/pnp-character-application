import { RecordType } from "api-spec";

export function parseRecordType(method: string): RecordType {
  return RecordType[method.toUpperCase() as keyof typeof RecordType];
}
