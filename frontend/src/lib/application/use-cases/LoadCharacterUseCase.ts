import { UseCase, LoadCharacterInput, LoadCharacterOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { CharacterService } from "../../services/characterService";
import { featureLogger } from "../../utils/featureLogger";

/**
 * Use Case for loading a single character
 * Handles the business logic for character loading including validation and error handling
 *
 * Following clean architecture principles:
 * - Uses domain services for business logic
 * - Validates input at application boundary
 * - Returns structured results for proper error handling
 */
export class LoadCharacterUseCase implements UseCase<LoadCharacterInput, LoadCharacterOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: LoadCharacterInput): Promise<Result<LoadCharacterOutput, Error>> {
    featureLogger.debug("usecase", "LoadCharacterUseCase", "Loading character:", input.characterId);

    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error("Character ID is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      // Delegate to domain service
      const result = await this.characterService.getCharacter(input.characterId, input.idToken);

      if (!result.success) {
        featureLogger.error("LoadCharacterUseCase", "Failed to load character:", result.error);
        return ResultError(new Error(`Failed to load character: ${result.error.message}`));
      }

      featureLogger.info("usecase", "LoadCharacterUseCase", "Character loaded:", result.data.name);

      // Return application-layer result with domain data
      return ResultSuccess({
        character: result.data,
      });
    } catch (error) {
      featureLogger.error("LoadCharacterUseCase", "Unexpected error:", error);
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }
}
