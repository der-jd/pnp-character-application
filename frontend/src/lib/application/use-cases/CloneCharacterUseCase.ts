import { UseCase, CloneCharacterInput, CloneCharacterOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { CharacterService } from "../../services/characterService";

/**
 * Use Case for cloning an existing character
 *
 * Business Rules:
 * - Validates source character exists and is accessible
 * - Creates complete copy of character including history
 * - Backend automatically generates clone name by appending " (Copy)"
 * - Returns the cloned character with generated name
 */
export class CloneCharacterUseCase implements UseCase<CloneCharacterInput, CloneCharacterOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: CloneCharacterInput): Promise<Result<CloneCharacterOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.sourceCharacterId) {
        return ResultError(new Error("Source character ID is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      // Validate source character exists and is accessible
      const sourceCharacterResult = await this.characterService.getCharacter(input.sourceCharacterId, input.idToken);
      if (!sourceCharacterResult.success) {
        return ResultError(new Error(`Failed to access source character: ${sourceCharacterResult.error.message}`));
      }

      // Execute character cloning through domain service
      const sourceCharacter = sourceCharacterResult.data;
      const cloneResult = await this.characterService.cloneCharacter(
        input.sourceCharacterId,
        { userIdOfCharacter: sourceCharacter.userId },
        input.idToken,
      );

      if (!cloneResult.success) {
        return ResultError(new Error(`Failed to clone character: ${cloneResult.error.message}`));
      }

      const cloneResponse = cloneResult.data;

      // Load the complete cloned character data
      const clonedCharacterResult = await this.characterService.getCharacter(cloneResponse.characterId, input.idToken);
      if (!clonedCharacterResult.success) {
        return ResultError(new Error("Character cloned but failed to load complete data"));
      }

      // Return application-layer result
      return ResultSuccess({
        clonedCharacter: clonedCharacterResult.data,
        characterId: cloneResponse.characterId,
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }
}
