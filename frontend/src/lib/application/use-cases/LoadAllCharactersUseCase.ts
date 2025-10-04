import { UseCase, LoadAllCharactersInput, LoadAllCharactersOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { CharacterService } from "../../services/characterService";

/**
 * Use Case for loading all characters for the current user
 *
 * Business Rules:
 * - Loads both own and shared characters
 * - Returns only accessible characters for the user
 * - Filters and transforms data for presentation layer
 *
 * Following clean architecture principles:
 * - Pure business logic implementation
 * - No UI concerns or side effects
 * - Proper error handling with Result pattern
 */
export class LoadAllCharactersUseCase implements UseCase<LoadAllCharactersInput, LoadAllCharactersOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: LoadAllCharactersInput): Promise<Result<LoadAllCharactersOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      // Load characters through domain service
      const result = await this.characterService.getAllCharacters(input.idToken);

      if (!result.success) {
        return ResultError(new Error(`Failed to load characters: ${result.error.message}`));
      }

      // Return application-layer result with domain data
      return ResultSuccess({
        characters: result.data,
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }
}
