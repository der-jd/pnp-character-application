export enum RecordType {
  EVENT_CALCULATION_POINTS = 0,
  EVENT_LEVEL_UP = 1,
  EVENT_BASE_VALUE = 2,
  PROFESSION_CHANGED = 3,
  HOBBY_CHANGED = 4,
  ADVANTAGE_CHANGED = 5,
  DISADVANTAGE_CHANGED = 6,
  SPECIAL_ABILITY_CHANGED = 7,
  ATTRIBUTE_RAISED = 8,
  SKILL_ACTIVATED = 9,
  SKILL_RAISED = 10,
  ATTACK_PARADE_DISTRIBUTED = 11,
}

export function parseRecordType(method: string): RecordType {
  return RecordType[method.toUpperCase() as keyof typeof RecordType];
}
