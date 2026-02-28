import { UseCase, LevelUpInput, LevelUpOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { CharacterService } from "../../services/characterService";

/**
 * Use Case for leveling up a character
 *
 * Business Rules:
 * - Validates character can level up
 * - Calculates points gained according to level progression rules
 * - Updates character through domain service
 * - Records level up in history
 *
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle complex operations
 * - All types from api-spec for consistency
 */
export class LevelUpUseCase implements UseCase<LevelUpInput, LevelUpOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: LevelUpInput): Promise<Result<LevelUpOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error("Character ID is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      if (input.currentLevel < 1) {
        return ResultError(new Error("Invalid current level"));
      }

      // Load current character to validate level
      const characterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!characterResult.success) {
        return ResultError(new Error(`Failed to load character: ${characterResult.error.message}`));
      }

      const character = characterResult.data;

      // Validate character level matches input
      if (character.level !== input.currentLevel) {
        return ResultError(new Error("Character level mismatch. Please reload character and try again."));
      }

      // Execute level up through domain service using proper api-spec format
      const updateResult = await this.characterService.levelUp(
        input.characterId,
        {
          initialLevel: input.currentLevel,
        },
        input.idToken,
      );

      if (!updateResult.success) {
        return ResultError(new Error(`Failed to level up character: ${updateResult.error.message}`));
      }

      // Extract level information from response
      const responseData = updateResult.data.data;
      const actualNewLevel = responseData.level.new.value;

      // For now, set points gained to reasonable defaults
      // TODO: Extract actual points from response when available
      const adventurePointsGained = 10; // Standard adventure points per level
      const attributePointsGained = 1; // Standard attribute points per level

      // Reload character to get updated state
      const updatedCharacterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!updatedCharacterResult.success) {
        return ResultError(new Error("Level up successful but failed to reload character"));
      }

      // Return application-layer result with level up information
      return ResultSuccess({
        updatedCharacter: updatedCharacterResult.data,
        newLevel: actualNewLevel,
        pointsGained: {
          adventurePoints: adventurePointsGained,
          attributePoints: attributePointsGained,
        },
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }
}
