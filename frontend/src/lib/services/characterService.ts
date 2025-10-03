import type {
  Character as ApiCharacter,
  GetCharacterResponse,
  GetCharactersResponse,
  PatchSkillRequest,
  PatchSkillResponse,
  PatchAttributeRequest,
  PatchAttributeResponse,
  PatchBaseValueRequest,
  PatchBaseValueResponse,
  PatchCombatStatsRequest,
  PatchCombatStatsResponse,
  PostLevelRequest,
  PostLevelResponse,
  PostCharactersRequest,
  PostCharactersResponse,
  DeleteCharacterResponse,
  PostSpecialAbilitiesRequest,
  PostSpecialAbilitiesResponse,
  PatchCalculationPointsRequest,
  PatchCalculationPointsResponse,
  PostCharacterCloneRequest,
  PostCharacterCloneResponse
} from 'api-spec';

import { Character } from '../domain/Character';
import { ApiClient } from './apiClient';
import { Result, ApiError } from '../types/result';

/**
 * Service for managing character data and operations
 * Follows backend-first architecture - all business logic handled by API
 */
export class CharacterService {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient();
  }

  /**
   * Retrieves a single character by ID
   */
  async getCharacter(characterId: string, idToken: string): Promise<Result<Character, ApiError>> {
    const result = await this.apiClient.get<GetCharacterResponse>(
      `characters/${characterId}`,
      idToken
    );

    if (!result.success) {
      return result;
    }

    // GetCharacterResponse is directly a Character (api-spec)
    const character = Character.fromApiData(result.data);
    return { success: true, data: character };
  }

  /**
   * Retrieves all characters for the current user
   */
  async getAllCharacters(idToken: string): Promise<Result<Character[], ApiError>> {
    const result = await this.apiClient.get<GetCharactersResponse>(
      'characters?character-short=true',
      idToken
    );

    if (!result.success) {
      return result;
    }

    // Filter out short characters and only process full characters
    const characters = result.data.characters
      .filter((apiChar): apiChar is ApiCharacter => 'characterSheet' in apiChar)
      .map(apiChar => Character.fromApiData(apiChar));
    
    return { success: true, data: characters };
  }

  /**
   * Creates a new character
   */
  async createCharacter(
    characterData: PostCharactersRequest,
    idToken: string
  ): Promise<Result<Character, ApiError>> {
    const result = await this.apiClient.post<PostCharactersResponse>(
      'characters',
      characterData,
      idToken
    );

    if (!result.success) {
      return result;
    }

    const character = Character.fromApiData(result.data.data.changes.new.character);
    return { success: true, data: character };
  }

  /**
   * Deletes a character by ID
   */
  async deleteCharacter(characterId: string, idToken: string): Promise<Result<void, ApiError>> {
    const result = await this.apiClient.delete<DeleteCharacterResponse>(
      `characters/${characterId}`,
      idToken
    );

    if (!result.success) {
      return result;
    }

    return { success: true, data: undefined };
  }

  /**
   * Clones an existing character
   * Note: Returns just the clone metadata, full character must be loaded separately
   */
  async cloneCharacter(
    sourceCharacterId: string,
    cloneData: PostCharacterCloneRequest,
    idToken: string
  ): Promise<Result<PostCharacterCloneResponse, ApiError>> {
    return await this.apiClient.post<PostCharacterCloneResponse>(
      `characters/${sourceCharacterId}/clone`,
      cloneData,
      idToken
    );
  }

  /**
   * Adds a special ability to a character
   */
  async addSpecialAbility(
    characterId: string,
    abilityData: PostSpecialAbilitiesRequest,
    idToken: string
  ): Promise<Result<PostSpecialAbilitiesResponse, ApiError>> {
    return await this.apiClient.post<PostSpecialAbilitiesResponse>(
      `characters/${characterId}/special-abilities`,
      abilityData,
      idToken
    );
  }

  /**
   * Updates character calculation points
   */
  async updateCalculationPoints(
    characterId: string,
    updateData: PatchCalculationPointsRequest,
    idToken: string
  ): Promise<Result<PatchCalculationPointsResponse, ApiError>> {
    return await this.apiClient.patch<PatchCalculationPointsResponse>(
      `characters/${characterId}/calculation-points`,
      updateData,
      idToken
    );
  }

  /**
   * Updates a character's skill
   * Returns update response data - caller should refresh character separately
   */
  async updateSkill(
    characterId: string,
    skillCategory: string,
    skillName: string,
    updateData: PatchSkillRequest,
    idToken: string
  ): Promise<Result<PatchSkillResponse, ApiError>> {
    return await this.apiClient.patch<PatchSkillResponse>(
      `characters/${characterId}/skills/${skillCategory}/${skillName}`,
      updateData,
      idToken
    );
  }

  /**
   * Updates a character's attribute
   * Returns update response data - caller should refresh character separately
   */
  async updateAttribute(
    characterId: string,
    attributeName: string,
    updateData: PatchAttributeRequest,
    idToken: string
  ): Promise<Result<PatchAttributeResponse, ApiError>> {
    return await this.apiClient.patch<PatchAttributeResponse>(
      `characters/${characterId}/attributes/${attributeName}`,
      updateData,
      idToken
    );
  }

  /**
   * Updates a character's base value
   * Returns update response data - caller should refresh character separately
   */
  async updateBaseValue(
    characterId: string,
    baseValueName: string,
    updateData: PatchBaseValueRequest,
    idToken: string
  ): Promise<Result<PatchBaseValueResponse, ApiError>> {
    return await this.apiClient.patch<PatchBaseValueResponse>(
      `characters/${characterId}/base-values/${baseValueName}`,
      updateData,
      idToken
    );
  }

  /**
   * Updates a character's combat stats
   * Returns update response data - caller should refresh character separately
   */
  async updateCombatStats(
    characterId: string,
    combatType: string,
    combatSkillName: string,
    updateData: PatchCombatStatsRequest,
    idToken: string
  ): Promise<Result<PatchCombatStatsResponse, ApiError>> {
    return await this.apiClient.patch<PatchCombatStatsResponse>(
      `characters/${characterId}/combat-stats/${combatType}/${combatSkillName}`,
      updateData,
      idToken
    );
  }

  /**
   * Levels up a character
   * Returns level up response data - caller should refresh character separately
   */
  async levelUp(
    characterId: string,
    levelUpData: PostLevelRequest,
    idToken: string
  ): Promise<Result<PostLevelResponse, ApiError>> {
    return await this.apiClient.post<PostLevelResponse>(
      `characters/${characterId}/level`,
      levelUpData,
      idToken
    );
  }
}