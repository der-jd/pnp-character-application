import type {
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
  PostCharacterCloneResponse,
} from "api-spec";

import { Character } from "../domain/Character";
import { CharacterSummary } from "../domain/CharacterSummary";
import { ApiClient } from "./apiClient";
import { Result, ApiError } from "../types/result";
import { featureLogger } from "../utils/featureLogger";

/**
 * Service for managing character data and operations
 * Follows backend-first architecture - all business logic handled by API
 */
export class CharacterService {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient();
    featureLogger.debug("service", "CharacterService", "Service initialized");
  }

  /**
   * Retrieves a single character by ID
   */
  async getCharacter(characterId: string, idToken: string): Promise<Result<Character, ApiError>> {
    featureLogger.debug("service", "CharacterService", "Getting character:", characterId);

    const result = await this.apiClient.get<GetCharacterResponse>(`characters/${characterId}`, idToken);

    if (!result.success) {
      featureLogger.error("CharacterService", "Failed to get character:", result.error);
      return result;
    }

    // GetCharacterResponse is directly a Character (api-spec)
    const character = Character.fromApiData(result.data);
    featureLogger.info("service", "CharacterService", "Character loaded:", character.name);
    return { success: true, data: character };
  }

  /**
   * Retrieves all characters for the current user
   * Returns CharacterSummary objects (lightweight representation)
   */
  async getAllCharacters(idToken: string): Promise<Result<CharacterSummary[], ApiError>> {
    featureLogger.debug("service", "CharacterService", "Getting all characters");

    const result = await this.apiClient.get<GetCharactersResponse>("characters?character-short=true", idToken);

    if (!result.success) {
      featureLogger.error("CharacterService", "Failed to get all characters:", result.error);
      return result;
    }

    // Map all characters (both full and short) to CharacterSummary
    const characters = result.data.characters.map((apiChar) => {
      // Check if it's a full character or short character
      if ("characterSheet" in apiChar) {
        // Full character - extract summary data
        return CharacterSummary.fromApiShortData({
          userId: apiChar.userId,
          characterId: apiChar.characterId,
          name: apiChar.characterSheet.generalInformation.name,
          level: apiChar.characterSheet.generalInformation.level,
        });
      } else {
        // Short character - use directly
        return CharacterSummary.fromApiShortData(apiChar);
      }
    });

    featureLogger.info("service", "CharacterService", "Loaded characters:", characters.length);
    return { success: true, data: characters };
  }

  /**
   * Creates a new character
   */
  async createCharacter(characterData: PostCharactersRequest, idToken: string): Promise<Result<Character, ApiError>> {
    featureLogger.debug("service", "CharacterService", "Creating character:", characterData.generalInformation.name);

    const result = await this.apiClient.post<PostCharactersResponse>("characters", characterData, idToken);

    if (!result.success) {
      featureLogger.error("CharacterService", "Failed to create character:", result.error);
      return result;
    }

    const character = Character.fromApiData(result.data.data.changes.new.character);
    featureLogger.info("service", "CharacterService", "Character created:", character.characterId);
    return { success: true, data: character };
  }

  /**
   * Deletes a character by ID
   */
  async deleteCharacter(characterId: string, idToken: string): Promise<Result<void, ApiError>> {
    featureLogger.debug("service", "CharacterService", "Deleting character:", characterId);

    const result = await this.apiClient.delete<DeleteCharacterResponse>(`characters/${characterId}`, idToken);

    if (!result.success) {
      featureLogger.error("CharacterService", "Failed to delete character:", result.error);
      return result;
    }

    featureLogger.info("service", "CharacterService", "Character deleted:", characterId);
    return { success: true, data: undefined };
  }

  /**
   * Clones an existing character
   * Note: Returns just the clone metadata, full character must be loaded separately
   */
  async cloneCharacter(
    sourceCharacterId: string,
    cloneData: PostCharacterCloneRequest,
    idToken: string,
  ): Promise<Result<PostCharacterCloneResponse, ApiError>> {
    featureLogger.debug("service", "CharacterService", "Cloning character:", sourceCharacterId);

    const result = await this.apiClient.post<PostCharacterCloneResponse>(
      `characters/${sourceCharacterId}/clone`,
      cloneData,
      idToken,
    );

    if (result.success) {
      featureLogger.info("service", "CharacterService", "Character cloned successfully");
    } else {
      featureLogger.error("CharacterService", "Failed to clone character:", result.error);
    }

    return result;
  }

  /**
   * Adds a special ability to a character
   */
  async addSpecialAbility(
    characterId: string,
    abilityData: PostSpecialAbilitiesRequest,
    idToken: string,
  ): Promise<Result<PostSpecialAbilitiesResponse, ApiError>> {
    featureLogger.debug("service", "CharacterService", "Adding special ability to:", characterId);

    const result = await this.apiClient.post<PostSpecialAbilitiesResponse>(
      `characters/${characterId}/special-abilities`,
      abilityData,
      idToken,
    );

    if (result.success) {
      featureLogger.info("service", "CharacterService", "Special ability added");
    } else {
      featureLogger.error("CharacterService", "Failed to add special ability:", result.error);
    }

    return result;
  }

  /**
   * Updates character calculation points
   */
  async updateCalculationPoints(
    characterId: string,
    updateData: PatchCalculationPointsRequest,
    idToken: string,
  ): Promise<Result<PatchCalculationPointsResponse, ApiError>> {
    featureLogger.debug("service", "CharacterService", "Updating calculation points:", characterId);

    const result = await this.apiClient.patch<PatchCalculationPointsResponse>(
      `characters/${characterId}/calculation-points`,
      updateData,
      idToken,
    );

    if (result.success) {
      featureLogger.info("service", "CharacterService", "Calculation points updated");
    } else {
      featureLogger.error("CharacterService", "Failed to update calculation points:", result.error);
    }

    return result;
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
    idToken: string,
  ): Promise<Result<PatchSkillResponse, ApiError>> {
    featureLogger.debug("service", "CharacterService", `Updating skill ${skillCategory}/${skillName}:`, characterId);

    const result = await this.apiClient.patch<PatchSkillResponse>(
      `characters/${characterId}/skills/${skillCategory}/${skillName}`,
      updateData,
      idToken,
    );

    if (result.success) {
      featureLogger.info("service", "CharacterService", "Skill updated:", skillName);
    } else {
      featureLogger.error("CharacterService", "Failed to update skill:", result.error);
    }

    return result;
  }

  /**
   * Updates a character's attribute
   * Returns update response data - caller should refresh character separately
   */
  async updateAttribute(
    characterId: string,
    attributeName: string,
    updateData: PatchAttributeRequest,
    idToken: string,
  ): Promise<Result<PatchAttributeResponse, ApiError>> {
    featureLogger.debug("service", "CharacterService", "Updating attribute:", attributeName);

    const result = await this.apiClient.patch<PatchAttributeResponse>(
      `characters/${characterId}/attributes/${attributeName}`,
      updateData,
      idToken,
    );

    if (result.success) {
      featureLogger.info("service", "CharacterService", "Attribute updated:", attributeName);
    } else {
      featureLogger.error("CharacterService", "Failed to update attribute:", result.error);
    }

    return result;
  }

  /**
   * Updates a character's base value
   * Returns update response data - caller should refresh character separately
   */
  async updateBaseValue(
    characterId: string,
    baseValueName: string,
    updateData: PatchBaseValueRequest,
    idToken: string,
  ): Promise<Result<PatchBaseValueResponse, ApiError>> {
    featureLogger.debug("service", "CharacterService", "Updating base value:", baseValueName);

    const result = await this.apiClient.patch<PatchBaseValueResponse>(
      `characters/${characterId}/base-values/${baseValueName}`,
      updateData,
      idToken,
    );

    if (result.success) {
      featureLogger.info("service", "CharacterService", "Base value updated:", baseValueName);
    } else {
      featureLogger.error("CharacterService", "Failed to update base value:", result.error);
    }

    return result;
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
    idToken: string,
  ): Promise<Result<PatchCombatStatsResponse, ApiError>> {
    featureLogger.debug("service", "CharacterService", `Updating combat stats ${combatType}/${combatSkillName}`);

    const result = await this.apiClient.patch<PatchCombatStatsResponse>(
      `characters/${characterId}/combat-stats/${combatType}/${combatSkillName}`,
      updateData,
      idToken,
    );

    if (result.success) {
      featureLogger.info("service", "CharacterService", "Combat stats updated:", combatSkillName);
    } else {
      featureLogger.error("CharacterService", "Failed to update combat stats:", result.error);
    }

    return result;
  }

  /**
   * Levels up a character
   * Returns level up response data - caller should refresh character separately
   */
  async levelUp(
    characterId: string,
    levelUpData: PostLevelRequest,
    idToken: string,
  ): Promise<Result<PostLevelResponse, ApiError>> {
    featureLogger.debug("service", "CharacterService", "Leveling up character:", characterId);

    const result = await this.apiClient.post<PostLevelResponse>(
      `characters/${characterId}/level`,
      levelUpData,
      idToken,
    );

    if (result.success) {
      featureLogger.info("service", "CharacterService", "Character leveled up");
    } else {
      featureLogger.error("CharacterService", "Failed to level up character:", result.error);
    }

    return result;
  }
}
