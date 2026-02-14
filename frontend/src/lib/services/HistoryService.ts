import type { GetHistoryResponse, DeleteHistoryRecordResponse, PatchHistoryRecordResponse, Record } from "api-spec";

export interface ServiceResult<T> {
  success: boolean;
  data: T;
  error?: string;
}

export class HistoryService {
  private readonly baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  async getHistory(characterId: string, token: string): Promise<ServiceResult<Record[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/characters/${characterId}/history`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          data: [],
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const result: GetHistoryResponse = await response.json();

      // Flatten history blocks into record array
      const records: Record[] = [];
      for (const block of result.items) {
        records.push(...block.changes);
      }

      return {
        success: true,
        data: records,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async revertHistoryEntry(
    characterId: string,
    entryId: string,
    token: string
  ): Promise<ServiceResult<DeleteHistoryRecordResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/characters/${characterId}/history/${entryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          data: {} as DeleteHistoryRecordResponse,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const result: DeleteHistoryRecordResponse = await response.json();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        data: {} as DeleteHistoryRecordResponse,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateHistoryComment(
    characterId: string,
    entryId: string,
    comment: string,
    token: string
  ): Promise<ServiceResult<PatchHistoryRecordResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/characters/${characterId}/history/${entryId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        return {
          success: false,
          data: {} as PatchHistoryRecordResponse,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const result: PatchHistoryRecordResponse = await response.json();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        data: {} as PatchHistoryRecordResponse,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
