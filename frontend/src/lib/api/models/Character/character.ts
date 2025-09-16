// Import all types from api-spec instead of defining our own
export type {
  Character,
  CharacterSheet,
  CalculationPoints,
  Attribute,
  BaseValue,
  Skill,
  CombatValues,
  CostCategory,
  LearningMethod,
  LearningMethodString,
  GeneralInformation,
  ProfessionHobby,
} from "api-spec";

// Re-export endpoint types for convenience
export type {
  PatchSkillRequest,
  PatchSkillPathParams,
  PatchAttributeRequest,
  PatchAttributePathParams,
  GetCharacterResponse,
  GetCharactersResponse,
  CharacterShort,
  PostLevelRequest,
  PostLevelPathParams,
  InitialNew,
  InitialIncreased,
} from "api-spec";
