import {
  getLevelUpResponseSchema,
  postLevelUpResponseSchema,
  type GetLevelUpResponse,
  type PostLevelUpRequest,
  type PostLevelUpResponse,
} from "api-spec";
import { get, post } from "./client";

export function fetchLevelUpOptions(characterId: string): Promise<GetLevelUpResponse> {
  return get(`/characters/${characterId}/level-up`, getLevelUpResponseSchema);
}

export function applyLevelUp(characterId: string, data: PostLevelUpRequest): Promise<PostLevelUpResponse> {
  return post(`/characters/${characterId}/level-up`, postLevelUpResponseSchema, data);
}
