export enum RecordType {
  EVENT_CALCULATION_POINTS = 0, // TODO change name to CALCULATION_POINTS_CHANGED?!
  EVENT_LEVEL_UP = 1, // TODO change name to LEVEL_UP?!
  EVENT_BASE_VALUE = 2, // TODO change name to BASE_VALUE_CHANGED?!
  PROFESSION_CHANGED = 3,
  HOBBY_CHANGED = 4,
  ADVANTAGE_CHANGED = 5,
  DISADVANTAGE_CHANGED = 6,
  SPECIAL_ABILITY_CHANGED = 7,
  ATTRIBUTE_RAISED = 8, // TODO change name to ATTRIBUTE_CHANGED?!
  SKILL_ACTIVATED = 9, // TODO remove and use SKILL_RAISED/SKILL_CHANGED instead?!
  SKILL_RAISED = 10, // TODO change name to SKILL_CHANGED?!
  ATTACK_PARADE_DISTRIBUTED = 11,
}

export function parseRecordType(method: string): RecordType {
  return RecordType[method.toUpperCase() as keyof typeof RecordType];
}
