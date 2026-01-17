import type {
  GetHistoryResponse,
  DeleteHistoryRecordResponse,
  PatchHistoryRecordRequest,
  PatchHistoryRecordResponse,
  Record as HistoryRecord,
} from "api-spec";

import { ApiClient } from "./apiClient";
import { Result, ApiError } from "../types/result";
import { featureLogger } from "../utils/featureLogger";

/**
 * Service for managing character history records
 * Handles history retrieval, deletion, and comment updates
 */
export class HistoryService {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient();
    featureLogger.debug("service", "HistoryService", "Service initialized");
  }

  /**
   * Retrieves the complete history for a character
   */
  async getHistory(characterId: string, idToken: string): Promise<Result<GetHistoryResponse, ApiError>> {
    featureLogger.debug("service", "HistoryService", "Getting history for character:", characterId);

    const result = await this.apiClient.get<GetHistoryResponse>(`characters/${characterId}/history`, idToken);

    if (result.success) {
      const recordCount = HistoryService.extractRecordsFromHistory(result.data).length;
      featureLogger.info("service", "HistoryService", "History loaded, records:", recordCount);
    } else {
      featureLogger.error("HistoryService", "Failed to get history:", result.error);
    }

    return result;
  }

  /**
   * Retrieves a specific history block by block number
   */
  async getHistoryBlock(
    characterId: string,
    blockNumber: number,
    idToken: string
  ): Promise<Result<GetHistoryResponse, ApiError>> {
    featureLogger.debug("service", "HistoryService", `Getting history block ${blockNumber} for:`, characterId);

    const result = await this.apiClient.get<GetHistoryResponse>(
      `characters/${characterId}/history?block=${blockNumber}`,
      idToken
    );

    if (result.success) {
      featureLogger.info("service", "HistoryService", "History block loaded:", blockNumber);
    } else {
      featureLogger.error("HistoryService", "Failed to get history block:", result.error);
    }

    return result;
  }

  /**
   * Deletes a history record by entry ID
   */
  async deleteHistoryRecord(
    characterId: string,
    entryId: string,
    idToken: string
  ): Promise<Result<DeleteHistoryRecordResponse, ApiError>> {
    featureLogger.debug("service", "HistoryService", "Deleting history record:", entryId);

    const result = await this.apiClient.delete<DeleteHistoryRecordResponse>(
      `characters/${characterId}/history/${entryId}`,
      idToken
    );

    if (result.success) {
      featureLogger.info("service", "HistoryService", "History record deleted:", entryId);
    } else {
      featureLogger.error("HistoryService", "Failed to delete history record:", result.error);
    }

    return result;
  }

  /**
   * Updates a history record (e.g., to change comment)
   */
  async updateHistoryRecord(
    characterId: string,
    entryId: string,
    updateData: PatchHistoryRecordRequest,
    idToken: string
  ): Promise<Result<PatchHistoryRecordResponse, ApiError>> {
    featureLogger.debug("service", "HistoryService", "Updating history record:", entryId);

    const result = await this.apiClient.patch<PatchHistoryRecordResponse>(
      `characters/${characterId}/history/${entryId}`,
      updateData,
      idToken
    );

    if (result.success) {
      featureLogger.info("service", "HistoryService", "History record updated:", entryId);
    } else {
      featureLogger.error("HistoryService", "Failed to update history record:", result.error);
    }

    return result;
  }

  /**
   * Helper method to extract records from history blocks
   */
  static extractRecordsFromHistory(historyResponse: GetHistoryResponse): HistoryRecord[] {
    if (!historyResponse.items || historyResponse.items.length === 0) {
      return [];
    }

    return historyResponse.items.flatMap((block) => block.changes || []);
  }

  /**
   * Helper method to find a specific record by ID
   */
  static findRecordById(historyResponse: GetHistoryResponse, recordId: string): HistoryRecord | null {
    const records = this.extractRecordsFromHistory(historyResponse);
    return records.find((record) => record.id === recordId) || null;
  }

  /**
   * Helper method to get the most recent records (limited count)
   */
  static getRecentRecords(historyResponse: GetHistoryResponse, limit: number = 10): HistoryRecord[] {
    const records = this.extractRecordsFromHistory(historyResponse);

    // Sort by timestamp (most recent first) and take the limit
    return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }
}
