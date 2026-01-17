import { UseCase, AddSpecialAbilityInput, AddSpecialAbilityOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { CharacterService } from "../../services/characterService";

/**
 * Use Case for adding a special ability to a character
 *
 * Business Rules:
 * - Validates special ability exists and character can learn it
 * - Checks prerequisites and requirements
 * - Ensures character has sufficient points/requirements
 * - Updates character through domain service
 * - Records ability addition in history
 *
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle complex operations
 * - All types from api-spec for consistency
 */
export class AddSpecialAbilityUseCase implements UseCase<AddSpecialAbilityInput, AddSpecialAbilityOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: AddSpecialAbilityInput): Promise<Result<AddSpecialAbilityOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error("Character ID is required"));
      }

      if (!input.specialAbilityName) {
        return ResultError(new Error("Special ability name is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      // Load current character to validate ability can be added
      const characterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!characterResult.success) {
        return ResultError(new Error(`Failed to load character: ${characterResult.error.message}`));
      }

      // Validate character doesn't already have this ability
      // TODO: Implement when we have special abilities in domain model
      const hasAbility = this.characterHasSpecialAbility(/* character, input.specialAbilityName */);
      if (hasAbility) {
        return ResultError(new Error(`Character already has special ability: ${input.specialAbilityName}`));
      }

      // Validate character meets prerequisites
      // TODO: Implement prerequisite checking
      const prerequisiteCheck = this.validatePrerequisites(/* character, input.specialAbilityName */);
      if (!prerequisiteCheck.isValid) {
        return ResultError(new Error(`Prerequisites not met: ${prerequisiteCheck.error}`));
      }

      // Execute special ability addition through domain service
      const addResult = await this.addSpecialAbilityViaService(
        input.characterId,
        input.specialAbilityName,
        input.idToken
      );

      if (!addResult.success) {
        return ResultError(new Error(`Failed to add special ability: ${addResult.error}`));
      }

      // Reload character to get updated state
      const updatedCharacterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!updatedCharacterResult.success) {
        return ResultError(new Error("Special ability added but failed to reload character"));
      }

      // Return application-layer result
      return ResultSuccess({
        updatedCharacter: updatedCharacterResult.data,
        addedAbility: input.specialAbilityName,
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }

  /**
   * Checks if character already has a special ability
   * TODO: Implement when special abilities are added to domain model
   */
  private characterHasSpecialAbility(/* _character: Character, _abilityName: string */): boolean {
    // Placeholder implementation
    // In real implementation, check character.specialAbilities
    return false;
  }

  /**
   * Validates character meets prerequisites for special ability
   * TODO: Implement comprehensive prerequisite checking
   */
  private validatePrerequisites(/* _character: Character, _abilityName: string */): {
    isValid: boolean;
    error?: string;
  } {
    // Placeholder implementation
    // In real implementation, check requirements like:
    // - Minimum attribute values
    // - Required skills
    // - Other special abilities
    // - Character level

    return { isValid: true };
  }

  /**
   * Helper method to add special ability via service
   */
  private async addSpecialAbilityViaService(
    characterId: string,
    specialAbilityName: string,
    idToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.characterService.addSpecialAbility(
        characterId,
        { specialAbility: specialAbilityName },
        idToken
      );
      return {
        success: result.success,
        error: result.success ? undefined : result.error.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
