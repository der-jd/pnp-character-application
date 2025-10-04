import { UseCase, DeleteHistoryEntryInput, DeleteHistoryEntryOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { HistoryService } from "../../services/historyService";
import { CharacterService } from "../../services/characterService";

/**
 * Use Case for deleting/reverting a history entry
 *
 * Business Rules:
 * - Validates history entry exists and can be reverted
 * - Reverts character changes associated with the entry
 * - Updates character state after reversion
 * - Records the reversion in history
 *
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle complex operations
 * - Transactional consistency for character updates
 */
export class DeleteHistoryEntryUseCase implements UseCase<DeleteHistoryEntryInput, DeleteHistoryEntryOutput> {
  constructor(
    private readonly historyService: HistoryService,
    private readonly characterService: CharacterService,
  ) {}

  async execute(input: DeleteHistoryEntryInput): Promise<Result<DeleteHistoryEntryOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error("Character ID is required"));
      }

      if (!input.historyEntryId) {
        return ResultError(new Error("History entry ID is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      // Load current character to validate access and get current state
      const characterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!characterResult.success) {
        return ResultError(new Error(`Failed to load character: ${characterResult.error.message}`));
      }

      // Execute history entry deletion through domain service
      const deleteResult = await this.historyService.deleteHistoryRecord(
        input.characterId,
        input.historyEntryId,
        input.idToken,
      );

      if (!deleteResult.success) {
        return ResultError(new Error(`Failed to delete history entry: ${deleteResult.error.message}`));
      }

      // Reload character to get updated state after reversion
      const updatedCharacterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!updatedCharacterResult.success) {
        return ResultError(new Error("History entry deleted but failed to reload character"));
      }

      // Return application-layer result
      return ResultSuccess({
        success: true,
        revertedCharacter: updatedCharacterResult.data,
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }
}
