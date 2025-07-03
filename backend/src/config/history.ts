export enum RecordType {
  CHARACTER_CREATED = 0,
  LEVEL_CHANGED = 1,
  CALCULATION_POINTS_CHANGED = 2,
  BASE_VALUE_CHANGED = 3,
  SPECIAL_ABILITIES_CHANGED = 4,
  ATTRIBUTE_CHANGED = 5,
  SKILL_CHANGED = 6,
  COMBAT_VALUES_CHANGED = 7,
}

export function parseRecordType(method: string): RecordType {
  return RecordType[method.toUpperCase() as keyof typeof RecordType];
}
