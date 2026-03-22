import {
  getCharactersResponseSchema,
  getCharacterResponseSchema,
  postCharactersResponseSchema,
  deleteCharacterResponseSchema,
  postCharacterCloneResponseSchema,
  type PostCharactersRequest,
  type GetCharactersResponse,
  type GetCharacterResponse,
  type PostCharactersResponse,
  type DeleteCharacterResponse,
  type PostCharacterCloneResponse,
} from "api-spec";
import { get, post, del } from "./client";

export function fetchCharacters(): Promise<GetCharactersResponse> {
  return get("/characters?character-short=true", getCharactersResponseSchema);
}

export function fetchCharacter(characterId: string): Promise<GetCharacterResponse> {
  return get(`/characters/${characterId}`, getCharacterResponseSchema);
}

export function createCharacter(data: PostCharactersRequest): Promise<PostCharactersResponse> {
  return post("/characters", postCharactersResponseSchema, data);
}

export function deleteCharacter(characterId: string): Promise<DeleteCharacterResponse> {
  return del(`/characters/${characterId}`, deleteCharacterResponseSchema);
}

export function cloneCharacter(characterId: string, userIdOfCharacter: string): Promise<PostCharacterCloneResponse> {
  return post(`/characters/${characterId}/clone`, postCharacterCloneResponseSchema, {
    userIdOfCharacter,
  });
}
