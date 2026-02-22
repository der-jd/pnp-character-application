/**
 * React Hook for History Page ViewModel
 *
 * This hook bridges the ViewModel (presentation layer) with React components (UI layer)
 * It manages React-specific concerns (useState, useEffect) while delegating business logic to the ViewModel
 *
 * Following clean architecture:
 * - UI layer depends on presentation layer
 * - ViewModel is framework-agnostic and testable
 * - Hook handles React lifecycle and state synchronization
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { HistoryPageViewModel, HistoryPageViewModelState } from "../lib/presentation/viewmodels/HistoryPageViewModel";
import { DeleteHistoryEntryUseCase } from "../lib/application/use-cases/DeleteHistoryEntryUseCase";
import { HistoryService } from "../lib/services/HistoryService";
import { CharacterService } from "../lib/services/characterService";
import { ApiClient } from "../lib/services/apiClient";
import { featureLogger } from "../lib/utils/featureLogger";

/**
 * Hook for managing history page state and actions
 */
export function useHistoryPageViewModel() {
  // Create ViewModel instance (memoized to prevent recreation on every render)
  const viewModel = useMemo(() => {
    featureLogger.debug("ui", "useHistoryPageViewModel", "Creating ViewModel instance...");
    const apiClient = new ApiClient();
    const historyService = new HistoryService(apiClient);
    const characterService = new CharacterService(apiClient);

    const deleteHistoryEntryUseCase = new DeleteHistoryEntryUseCase(historyService, characterService);

    const vm = new HistoryPageViewModel(deleteHistoryEntryUseCase, historyService);
    featureLogger.debug("ui", "useHistoryPageViewModel", "ViewModel created");
    return vm;
  }, []);

  // Local React state synced with ViewModel
  const [state, setState] = useState<HistoryPageViewModelState>(viewModel.getState());

  // Subscribe to ViewModel state changes
  useEffect(() => {
    const unsubscribe = viewModel.subscribe((newState: HistoryPageViewModelState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [viewModel]);

  // Wrap ViewModel actions with useCallback for stable references
  const loadHistory = useCallback(
    async (characterId: string, idToken: string) => {
      await viewModel.loadHistory(characterId, idToken);
    },
    [viewModel]
  );

  const deleteHistoryEntry = useCallback(
    async (characterId: string, idToken: string, entryId: string) => {
      return await viewModel.deleteHistoryEntry(characterId, idToken, entryId);
    },
    [viewModel]
  );

  const clearError = useCallback(() => {
    viewModel.clearError();
  }, [viewModel]);

  return {
    // State
    historyEntries: state.historyEntries,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    loadHistory,
    deleteHistoryEntry,
    clearError,
  };
}
