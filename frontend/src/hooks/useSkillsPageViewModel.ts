import { useMemo, useSyncExternalStore } from "react";
import { SkillsPageViewModel } from "@/src/lib/presentation/viewmodels/SkillsPageViewModel";
import { useCharacterStore } from "@/src/app/global/characterStore";

/**
 * React hook for SkillsPageViewModel
 *
 * Creates and manages SkillsPageViewModel instance with proper dependency injection
 * Subscribes to both ViewModel state and character store changes
 *
 * Usage:
 * const {
 *   characterSheet,
 *   editMode,
 *   skillsByCategory,
 *   toggleEdit,
 *   getEditButtonText
 * } = useSkillsPageViewModel();
 */
export function useSkillsPageViewModel() {
  // Get character sheet (data only)
  const characterSheet = useCharacterStore((state) => state.characterSheet);

  // Create ViewModel instance (singleton per component)
  const viewModel = useMemo(() => {
    return new SkillsPageViewModel(characterSheet);
  }, [characterSheet]); // Include characterSheet to recreate when it changes

  // Update ViewModel when character sheet changes
  useMemo(() => {
    viewModel.setCharacterSheet(characterSheet);
  }, [characterSheet, viewModel]);

  // Subscribe to ViewModel state changes
  const state = useSyncExternalStore(
    (callback) => viewModel.subscribe(callback),
    () => viewModel.getState(),
    () => viewModel.getState()
  );

  // Toggle edit mode - sync both ViewModel and Store
  const handleToggleEdit = () => {
    // Toggle ViewModel state
    viewModel.toggleEdit();

    // If leaving edit mode, clear open history entries
    if (state.editMode) {
      useCharacterStore.getState().setOpenHistoryEntries([]);
    }

    // Toggle store edit mode (for SkillTable and other components)
    useCharacterStore.getState().toggleEdit();
  };

  // Return state and operations
  return {
    ...state,
    toggleEdit: handleToggleEdit,
    getEditButtonText: () => viewModel.getEditButtonText(),
    hasCharacter: () => viewModel.hasCharacter(),
    clearError: () => viewModel.clearError(),
  };
}
