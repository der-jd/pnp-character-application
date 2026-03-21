import { BaseViewModel, BaseViewModelState } from "./BaseViewModel";
import { LoadAllCharactersUseCase } from "../../application/use-cases/LoadAllCharactersUseCase";
import { featureLogger } from "../../utils/featureLogger";

/**
 * Character summary for display in the dashboard
 */
export interface CharacterSummary {
  characterId: string;
  name: string;
  level: number;
  owner?: string;
  isShared: boolean;
}

/**
 * Dashboard ViewModel state
 */
export interface DashboardViewModelState extends BaseViewModelState {
  ownCharacters: CharacterSummary[];
  sharedCharacters: CharacterSummary[];
}

/**
 * DashboardViewModel - Manages dashboard state and business logic
 *
 * Responsibilities:
 * - Load user's own characters and shared characters
 * - Manage character selection for editing
 * - Handle character sharing flow
 * - Manage local UI state (share dialog, etc.)
 *
 * Following clean architecture:
 * - Presentation layer - manages UI state
 * - Uses LoadAllCharactersUseCase for business logic
 * - Framework-agnostic (no React dependencies)
 * - Testable without mounting components
 */
export class DashboardViewModel extends BaseViewModel<DashboardViewModelState> {
  private readonly loadAllCharactersUseCase: LoadAllCharactersUseCase;

  constructor(loadAllCharactersUseCase: LoadAllCharactersUseCase) {
    super({
      isLoading: false,
      error: null,
      ownCharacters: [],
      sharedCharacters: [],
    });

    this.loadAllCharactersUseCase = loadAllCharactersUseCase;
  }

  /**
   * Load all characters (own and shared)
   */
  async loadCharacters(idToken: string): Promise<void> {
    featureLogger.debug("viewmodel", "DashboardViewModel", "Loading characters");

    this.setLoading(true);

    const result = await this.loadAllCharactersUseCase.execute({ idToken });

    if (!result.success) {
      featureLogger.error("DashboardViewModel", "Failed to load characters:", result.error);
      this.setError(result.error.message);
      return;
    }

    featureLogger.info("viewmodel", "DashboardViewModel", `Loaded ${result.data.characters.length} characters`);

    // Separate own and shared characters
    const ownCharacters: CharacterSummary[] = [];
    const sharedCharacters: CharacterSummary[] = [];

    result.data.characters.forEach((char) => {
      const summary: CharacterSummary = {
        characterId: char.characterId,
        name: char.name,
        level: char.level,
        owner: char.userId, // Using userId as owner
        isShared: false, // TODO: Add isShared flag from API
      };

      // For now, all characters are "own" until API provides shared flag
      ownCharacters.push(summary);
    });

    this.updateState({
      ownCharacters,
      sharedCharacters,
      isLoading: false,
      error: null,
    });
  }

  /**
   * Get character count for display
   */
  getCharacterCount(): { own: number; shared: number; total: number } {
    return {
      own: this.state.ownCharacters.length,
      shared: this.state.sharedCharacters.length,
      total: this.state.ownCharacters.length + this.state.sharedCharacters.length,
    };
  }
}
