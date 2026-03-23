import {
  getHistoryResponseSchema,
  patchHistoryRecordResponseSchema,
  deleteHistoryRecordResponseSchema,
  type GetHistoryResponse,
  type PatchHistoryRecordResponse,
  type DeleteHistoryRecordResponse,
} from "api-spec";
import { get, patch, del } from "./client";

export function fetchHistory(characterId: string, blockNumber?: number): Promise<GetHistoryResponse> {
  const query = blockNumber !== undefined ? `?block-number=${blockNumber}` : "";
  return get(`/characters/${characterId}/history${query}`, getHistoryResponseSchema);
}

export function updateHistoryComment(
  characterId: string,
  recordId: string,
  comment: string,
  blockNumber?: number,
): Promise<PatchHistoryRecordResponse> {
  const query = blockNumber !== undefined ? `?block-number=${blockNumber}` : "";
  return patch(`/characters/${characterId}/history/${recordId}${query}`, patchHistoryRecordResponseSchema, { comment });
}

export function revertHistoryRecord(characterId: string, recordId: string): Promise<DeleteHistoryRecordResponse> {
  return del(`/characters/${characterId}/history/${recordId}`, deleteHistoryRecordResponseSchema);
}
