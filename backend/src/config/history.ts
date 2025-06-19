export enum RecordType {
  EVENT_CALCULATION_POINTS = 0, // TODO change name to CALCULATION_POINTS_CHANGED?!
  EVENT_LEVEL_UP = 1, // TODO change name to LEVEL_UP?!
  BASE_VALUE_CHANGED = 2,
  PROFESSION_CHANGED = 3,
  HOBBY_CHANGED = 4,
  ADVANTAGE_CHANGED = 5,
  DISADVANTAGE_CHANGED = 6,
  SPECIAL_ABILITY_CHANGED = 7,
  ATTRIBUTE_CHANGED = 8,
  CHARACTER_CREATED = 9,
  SKILL_CHANGED = 10,
  COMBAT_VALUES_CHANGED = 11,
}

export function parseRecordType(method: string): RecordType {
  return RecordType[method.toUpperCase() as keyof typeof RecordType];
}
