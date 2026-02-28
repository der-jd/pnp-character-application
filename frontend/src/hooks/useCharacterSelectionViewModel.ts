import { useMemo, useSyncExternalStore } from "react";
import { CharacterSelectionViewModel } from "@/src/lib/presentation/viewmodels/CharacterSelectionViewModel";
import { LoadAllCharactersUseCase } from "@/src/lib/application/use-cases/LoadAllCharactersUseCase";
import { LoadCharacterUseCase } from "@/src/lib/application/use-cases/LoadCharacterUseCase";
import { CharacterService } from "@/src/lib/services/characterService";
import { ApiClient } from "@/src/lib/services/apiClient";

/**
 * React hook for CharacterSelectionViewModel
 *
 * Creates and manages CharacterSelectionViewModel instance with proper dependency injection
 * Subscribes to state changes for automatic re-renders
 *
 * Used in sidebar for character selection dropdown
 *
 * Usage:
 * const {
 *   availableCharacters,
 *   selectedCharacterId,
 *   isLoading,
 *   error,
 *   loadAvailableCharacters,
 *   selectCharacter,
 *   clearSelection
 * } = useCharacterSelectionViewModel();
 */
export function useCharacterSelectionViewModel() {
  // Create ViewModel instance with dependencies (singleton per component)
  const viewModel = useMemo(() => {
    const apiClient = new ApiClient();
    const characterService = new CharacterService(apiClient);
    const loadAllCharactersUseCase = new LoadAllCharactersUseCase(characterService);
    const loadCharacterUseCase = new LoadCharacterUseCase(characterService);
    return new CharacterSelectionViewModel(loadAllCharactersUseCase, loadCharacterUseCase);
  }, []);

  // Subscribe to ViewModel state changes
  const state = useSyncExternalStore(
    (callback) => viewModel.subscribe(callback),
    () => viewModel.getState(),
    () => viewModel.getState(),
  );

  // Return state and operations
  return {
    ...state,
    loadAvailableCharacters: (idToken: string) => viewModel.loadAvailableCharacters(idToken),
    selectCharacter: (idToken: string, characterId: string) => viewModel.selectCharacter(idToken, characterId),
    setSelectedCharacterId: (characterId: string | null) => viewModel.setSelectedCharacterId(characterId),
    getSelectedCharacter: () => viewModel.getSelectedCharacter(),
    clearSelection: () => viewModel.clearSelection(),
    clearError: () => viewModel.clearError(),
  };
}
