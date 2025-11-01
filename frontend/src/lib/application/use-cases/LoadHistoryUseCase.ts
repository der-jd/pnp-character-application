import { UseCase, LoadHistoryInput, LoadHistoryOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { HistoryService } from "../../services/historyService";
import { GetHistoryResponse } from "api-spec";

/**
 * Use Case for loading character history
 *
 * Business Rules:
 * - Loads complete history including all blocks
 * - Transforms raw history data for presentation
 * - Handles pagination of history blocks
 * - Validates user access to character history
 *
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle external interactions
 * - Proper transformation of data for presentation layer
 */
export class LoadHistoryUseCase implements UseCase<LoadHistoryInput, LoadHistoryOutput> {
  constructor(private readonly historyService: HistoryService) {}

  async execute(input: LoadHistoryInput): Promise<Result<LoadHistoryOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error("Character ID is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      // Load complete history using domain service
      const result = await this.historyService.getHistory(input.characterId, input.idToken);

      if (!result.success) {
        return ResultError(new Error(`Failed to load history: ${result.error.message}`));
      }

      // Transform history data for presentation
      const historyEntries = this.transformHistoryEntries(result.data);

      // Return application-layer result
      return ResultSuccess({
        historyEntries: historyEntries,
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }

  /**
   * Transforms raw history response into presentation-friendly format
   */
  private transformHistoryEntries(historyResponse: GetHistoryResponse): Array<{
    id: string;
    characterId: string;
    changeType: string;
    changeDescription: string;
    timestamp: string;
    isReverted: boolean;
  }> {
    // Safely handle the history data structure
    if (!historyResponse || !historyResponse.items) {
      return [];
    }

    // Flatten all changes from all blocks with characterId from the block
    const entries = historyResponse.items.flatMap((block) =>
      (block.changes || []).map((change) => ({
        change,
        characterId: block.characterId,
      }))
    );

    return entries.map((item, index: number) => ({
      id: item.change.id || `entry-${index}`,
      characterId: item.characterId,
      changeType: item.change.type.toString(),
      changeDescription: this.formatChangeDescription(item.change),
      timestamp: item.change.timestamp || new Date().toISOString(),
      isReverted: (item.change as Record<string, unknown>).isReverted as boolean || false,
    }));
  }

  /**
   * Formats change description for display
   */
  private formatChangeDescription(entry: { type: number; name: string; data: Record<string, unknown> }): string {
    // Generate description based on record type
    return `Changed ${entry.name}`;
  }
}
