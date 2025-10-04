import { UseCase, LoadHistoryInput, LoadHistoryOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { HistoryService } from "../../services/historyService";
import { GetHistoryResponse, Record as HistoryRecord } from "api-spec";

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

    const entries = historyResponse.items.flatMap((block) => block.changes || []);

    return entries.map((entry, index: number) => ({
      id: entry.id || `entry-${index}`,
      characterId: "", // Will be extracted from block level
      changeType: String(entry.type) || "unknown",
      changeDescription: this.formatChangeDescription(entry),
      timestamp: entry.timestamp || new Date().toISOString(),
      isReverted: false, // Default value since not available in this structure
    }));
  }

  /**
   * Formats change description for display
   */
  private formatChangeDescription(entry: HistoryRecord): string {
    // Generate description based on record name and type
    if (entry.name) {
      return `${entry.type}: ${entry.name}`;
    }

    return `${entry.type} change`;
  }
}
