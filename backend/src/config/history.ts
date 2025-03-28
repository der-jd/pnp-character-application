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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RecordType {
  export function parse(method: string): RecordType {
    /**
     * The function itself is added as a key to the enum, because it is part of a namespace with the same name.
     * Therefore, Exclude<> is used to remove the function name from the keys of the enum.
     */
    return RecordType[method.toUpperCase() as Exclude<keyof typeof RecordType, "parse">];
  }
}
