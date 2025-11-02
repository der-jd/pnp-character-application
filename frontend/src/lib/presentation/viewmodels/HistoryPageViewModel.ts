/**
 * ViewModel for History Page
 *
 * Responsibilities:
 * - Transform domain/application data for UI consumption
 * - Manage UI state (loading, errors)
 * - Handle user interactions and coordinate with use cases
 * - Provide formatted data for presentation
 *
 * Following clean architecture:
 * - Presentation layer sits between UI and Application layer
 * - No direct UI framework dependencies (React hooks in separate file)
 * - Testable without mounting components
 */

import { DeleteHistoryEntryUseCase } from "../../application/use-cases/DeleteHistoryEntryUseCase";
import { HistoryService } from "../../services/historyService";
import { GetHistoryResponse, Record as ApiHistoryRecord } from "api-spec";
import { RecordEntry } from "../../api/models/history/interface";
import { featureLogger } from "../../utils/featureLogger";
import { BaseViewModel, BaseViewModelState } from "./BaseViewModel";

export interface HistoryPageViewModelState extends BaseViewModelState {
  historyEntries: RecordEntry[];
}

export interface HistoryPageViewModelActions {
  loadHistory: (characterId: string, idToken: string) => Promise<void>;
  deleteHistoryEntry: (characterId: string, idToken: string, entryId: string) => Promise<boolean>;
  clearError: () => void;
}

export class HistoryPageViewModel extends BaseViewModel<HistoryPageViewModelState> {
  constructor(
    private readonly deleteHistoryEntryUseCase: DeleteHistoryEntryUseCase,
    private readonly historyService: HistoryService
  ) {
    super({
      historyEntries: [],
      isLoading: false,
      error: null,
    });
  }

  /**
   * Load history for character
   */
  public async loadHistory(characterId: string, idToken: string): Promise<void> {
    featureLogger.debug("viewmodel", "HistoryPageViewModel", "Loading history for character:", characterId);
    this.setLoading(true);

    try {
      // For now, use the service directly to get RecordEntry[]
      // Later we can refactor the use case to return the proper format
      featureLogger.debug("viewmodel", "HistoryPageViewModel", "Calling historyService.getHistory...");
      const result = await this.historyService.getHistory(characterId, idToken);

      featureLogger.debug("viewmodel", "HistoryPageViewModel", "Service result:", result);

      if (!result.success) {
        featureLogger.error("HistoryPageViewModel", "Failed to load history:", result.error);
        this.setError(result.error.message || "Failed to load history");
        return;
      }

      // Transform the history response to flat RecordEntry array
      featureLogger.debug("viewmodel", "HistoryPageViewModel", "Transforming history response...");
      const historyEntries = this.transformHistoryResponse(result.data);
      featureLogger.debug("viewmodel", "HistoryPageViewModel", "Transformed entries:", historyEntries.length);

      this.updateState({
        isLoading: false,
        historyEntries,
        error: null,
      });
    } catch (error) {
      featureLogger.error("HistoryPageViewModel", "Exception while loading history:", error);
      this.setError(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }

  /**
   * Transform GetHistoryResponse to RecordEntry[]
   * Adapts API types to UI types
   */
  private transformHistoryResponse(response: GetHistoryResponse): RecordEntry[] {
    if (!response || !response.items) {
      return [];
    }

    const apiRecords = response.items.flatMap((block) => block.changes || []);
    return apiRecords.map((apiRecord) => this.adaptApiRecordToRecordEntry(apiRecord));
  }

  /**
   * Adapt API Record type to local RecordEntry type
   * This handles the mismatch between api-spec and local interfaces
   */
  private adaptApiRecordToRecordEntry(apiRecord: ApiHistoryRecord): RecordEntry {
    return {
      ...apiRecord,
      // Map calculationPoints to calculationPointsChange
      calculationPointsChange: {
        adjustment: 0, // Will need to calculate from old/new if needed
        old: 0,
        new: 0,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as RecordEntry;
  }

  /**
   * Delete a history entry (revert a change)
   */
  public async deleteHistoryEntry(characterId: string, idToken: string, entryId: string): Promise<boolean> {
    this.setLoading(true);

    const result = await this.deleteHistoryEntryUseCase.execute({
      characterId,
      idToken,
      historyEntryId: entryId,
    });

    if (!result.success) {
      this.setError(result.error.message || "Failed to delete history entry");
      return false;
    }

    this.setSuccess();
    return true;
  }
}
