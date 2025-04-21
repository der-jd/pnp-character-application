export enum RecordType {
  EVENT_CALCULATION_POINTS,
  EVENT_LEVEL_UP,
  EVENT_BASE_VALUE,
  PROFESSION_CHANGED,
  HOBBY_CHANGED,
  ADVANTAGE_CHANGED,
  DISADVANTAGE_CHANGED,
  SPECIAL_ABILITY_CHANGED,
  ATTRIBUTE_RAISED,
  SKILL_ACTIVATED,
  SKILL_RAISED,
  ATTACK_PARADE_DISTRIBUTED,
}

export function parseRecordType(method: string): RecordType {
  return RecordType[method.toUpperCase() as keyof typeof RecordType];
}
