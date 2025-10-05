import type {
  GetHistoryResponse,
  DeleteHistoryRecordResponse,
  PatchHistoryRecordRequest,
  PatchHistoryRecordResponse,
  Record as HistoryRecord,
} from "api-spec";

import { ApiClient } from "./apiClient";
import { Result, ApiError } from "../types/result";

/**
 * Service for managing character history records
 * Handles history retrieval, deletion, and comment updates
 */
export class HistoryService {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient();
  }

  /**
   * Retrieves the complete history for a character
   */
  async getHistory(characterId: string, idToken: string): Promise<Result<GetHistoryResponse, ApiError>> {
    return await this.apiClient.get<GetHistoryResponse>(`characters/${characterId}/history`, idToken);
  }

  /**
   * Retrieves a specific history block by block number
   */
  async getHistoryBlock(
    characterId: string,
    blockNumber: number,
    idToken: string
  ): Promise<Result<GetHistoryResponse, ApiError>> {
    return await this.apiClient.get<GetHistoryResponse>(
      `characters/${characterId}/history?block=${blockNumber}`,
      idToken
    );
  }

  /**
   * Deletes a history record by entry ID
   */
  async deleteHistoryRecord(
    characterId: string,
    entryId: string,
    idToken: string
  ): Promise<Result<DeleteHistoryRecordResponse, ApiError>> {
    return await this.apiClient.delete<DeleteHistoryRecordResponse>(
      `characters/${characterId}/history/${entryId}`,
      idToken
    );
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
    return await this.apiClient.patch<PatchHistoryRecordResponse>(
      `characters/${characterId}/history/${entryId}`,
      updateData,
      idToken
    );
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
