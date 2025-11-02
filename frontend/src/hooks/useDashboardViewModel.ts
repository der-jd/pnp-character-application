import { useMemo, useSyncExternalStore } from "react";
import { DashboardViewModel } from "@/src/lib/presentation/viewmodels/DashboardViewModel";
import { LoadAllCharactersUseCase } from "@/src/lib/application/use-cases/LoadAllCharactersUseCase";
import { CharacterService } from "@/src/lib/services/characterService";

/**
 * React hook for DashboardViewModel
 *
 * Creates and manages DashboardViewModel instance with proper dependency injection
 * Subscribes to state changes for automatic re-renders
 *
 * Usage:
 * const { ownCharacters, sharedCharacters, isLoading, error, loadCharacters } = useDashboardViewModel();
 */
export function useDashboardViewModel() {
  // Create ViewModel instance with dependencies (singleton per component)
  const viewModel = useMemo(() => {
    const characterService = new CharacterService();
    const loadAllCharactersUseCase = new LoadAllCharactersUseCase(characterService);
    return new DashboardViewModel(loadAllCharactersUseCase);
  }, []);

  // Subscribe to ViewModel state changes
  const state = useSyncExternalStore(
    (callback) => viewModel.subscribe(callback),
    () => viewModel.getState(),
    () => viewModel.getState()
  );

  // Return state and operations
  return {
    ...state,
    loadCharacters: (idToken: string) => viewModel.loadCharacters(idToken),
    getCharacterCount: () => viewModel.getCharacterCount(),
    clearError: () => viewModel.clearError(),
  };
}
