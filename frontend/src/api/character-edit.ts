import {
  patchAttributeResponseSchema,
  patchBaseValueResponseSchema,
  patchSkillResponseSchema,
  patchCombatStatsResponseSchema,
  patchCalculationPointsResponseSchema,
  postSpecialAbilitiesResponseSchema,
  getSkillResponseSchema,
  type PatchAttributeRequest,
  type PatchAttributeResponse,
  type PatchBaseValueRequest,
  type PatchBaseValueResponse,
  type PatchSkillRequest,
  type PatchSkillResponse,
  type PatchCombatStatsRequest,
  type PatchCombatStatsResponse,
  type PatchCalculationPointsRequest,
  type PatchCalculationPointsResponse,
  type PostSpecialAbilitiesResponse,
  type GetSkillResponse,
  type LearningMethodString,
} from "api-spec";
import { get, patch, post } from "./client";

export function updateAttribute(
  characterId: string,
  attributeName: string,
  data: PatchAttributeRequest,
): Promise<PatchAttributeResponse> {
  return patch(`/characters/${characterId}/attributes/${attributeName}`, patchAttributeResponseSchema, data);
}

export function updateBaseValue(
  characterId: string,
  baseValueName: string,
  data: PatchBaseValueRequest,
): Promise<PatchBaseValueResponse> {
  return patch(`/characters/${characterId}/base-values/${baseValueName}`, patchBaseValueResponseSchema, data);
}

export function updateSkill(
  characterId: string,
  skillCategory: string,
  skillName: string,
  data: PatchSkillRequest,
): Promise<PatchSkillResponse> {
  return patch(`/characters/${characterId}/skills/${skillCategory}/${skillName}`, patchSkillResponseSchema, data);
}

export function getSkillIncreaseCost(
  characterId: string,
  skillCategory: string,
  skillName: string,
  learningMethod: LearningMethodString,
): Promise<GetSkillResponse> {
  return get(
    `/characters/${characterId}/skills/${skillCategory}/${skillName}?learning-method=${learningMethod}`,
    getSkillResponseSchema,
  );
}

export function updateCombatStats(
  characterId: string,
  combatCategory: string,
  combatSkillName: string,
  data: PatchCombatStatsRequest,
): Promise<PatchCombatStatsResponse> {
  return patch(
    `/characters/${characterId}/combat/${combatCategory}/${combatSkillName}`,
    patchCombatStatsResponseSchema,
    data,
  );
}

export function updateCalculationPoints(
  characterId: string,
  data: PatchCalculationPointsRequest,
): Promise<PatchCalculationPointsResponse> {
  return patch(`/characters/${characterId}/calculation-points`, patchCalculationPointsResponseSchema, data);
}

export function addSpecialAbility(characterId: string, specialAbility: string): Promise<PostSpecialAbilitiesResponse> {
  return post(`/characters/${characterId}/special-abilities`, postSpecialAbilitiesResponseSchema, { specialAbility });
}
