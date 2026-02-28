import { BaseViewModel } from "./BaseViewModel";
import { LoadAllCharactersUseCase } from "@/src/lib/application/use-cases/LoadAllCharactersUseCase";
import { LoadCharacterUseCase } from "@/src/lib/application/use-cases/LoadCharacterUseCase";
import { featureLogger } from "@/src/lib/utils/featureLogger";

/**
 * Character option for dropdown selection
 */
export interface CharacterOption {
  characterId: string;
  name: string;
  userId: string;
  level: number;
}

/**
 * State for CharacterSelectionViewModel
 */
export interface CharacterSelectionViewModelState {
  availableCharacters: CharacterOption[];
  selectedCharacterId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * ViewModel for character selection in sidebar
 *
 * Manages the list of available characters and handles character selection
 * Follows clean architecture pattern with UseCases for business logic
 */
export class CharacterSelectionViewModel extends BaseViewModel<CharacterSelectionViewModelState> {
  constructor(
    private readonly loadAllCharactersUseCase: LoadAllCharactersUseCase,
    private readonly loadCharacterUseCase: LoadCharacterUseCase,
  ) {
    super({
      availableCharacters: [],
      selectedCharacterId: null,
      isLoading: false,
      error: null,
    });
  }

  /**
   * Load all available characters for the current user
   */
  async loadAvailableCharacters(idToken: string): Promise<void> {
    featureLogger.debug("viewmodel", "CharacterSelectionViewModel", "Loading available characters");
    this.setLoading(true);

    const result = await this.loadAllCharactersUseCase.execute({ idToken });

    if (!result.success) {
      featureLogger.error("CharacterSelectionViewModel", "Failed to load characters:", result.error);
      this.setError(result.error.message);
      return;
    }

    const characters = result.data.characters.map((char) => ({
      characterId: char.characterId,
      name: char.name,
      userId: char.userId,
      level: char.level,
    }));

    this.updateState({
      availableCharacters: characters,
      isLoading: false,
    });

    featureLogger.debug("viewmodel", "CharacterSelectionViewModel", `Loaded ${characters.length} characters`);
  }

  /**
   * Select and load a specific character
   */
  async selectCharacter(idToken: string, characterId: string): Promise<boolean> {
    featureLogger.debug("viewmodel", "CharacterSelectionViewModel", `Selecting character: ${characterId}`);
    this.setLoading(true);

    const result = await this.loadCharacterUseCase.execute({ idToken, characterId });

    if (!result.success) {
      featureLogger.error("CharacterSelectionViewModel", "Failed to load character:", result.error);
      this.setError(result.error.message);
      return false;
    }

    this.updateState({
      selectedCharacterId: characterId,
      isLoading: false,
    });

    featureLogger.info("viewmodel", "CharacterSelectionViewModel", `Character ${characterId} loaded successfully`);
    return true;
  }

  /**
   * Set the selected character ID without loading
   */
  setSelectedCharacterId(characterId: string | null): void {
    this.updateState({ selectedCharacterId: characterId });
  }

  /**
   * Get the currently selected character option
   */
  getSelectedCharacter(): CharacterOption | null {
    const { selectedCharacterId, availableCharacters } = this.state;
    if (!selectedCharacterId) return null;
    return availableCharacters.find((char) => char.characterId === selectedCharacterId) ?? null;
  }

  /**
   * Clear the selected character
   */
  clearSelection(): void {
    this.updateState({ selectedCharacterId: null });
  }

  /**
   * Clear any error state
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  protected setLoading(isLoading: boolean): void {
    this.updateState({ isLoading, error: isLoading ? null : this.state.error });
  }

  protected setError(error: string): void {
    this.updateState({ isLoading: false, error });
  }
}
