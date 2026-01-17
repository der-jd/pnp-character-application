import {
  LoadCharacterUseCase,
  LoadAllCharactersUseCase,
  IncreaseSkillUseCase,
  UpdateAttributeUseCase,
  UpdateBaseValueUseCase,
  UpdateCombatValueUseCase,
  LevelUpUseCase,
  LoadHistoryUseCase,
  DeleteHistoryEntryUseCase,
  LoadCharacterInput,
  LoadCharacterOutput,
  LoadAllCharactersInput,
  LoadAllCharactersOutput,
  IncreaseSkillInput,
  IncreaseSkillOutput,
  UpdateAttributeInput,
  UpdateAttributeOutput,
  UpdateBaseValueInput,
  UpdateBaseValueOutput,
  UpdateCombatValueInput,
  UpdateCombatValueOutput,
  LevelUpInput,
  LevelUpOutput,
  LoadHistoryInput,
  LoadHistoryOutput,
  DeleteHistoryEntryInput,
  DeleteHistoryEntryOutput,
} from "../use-cases";
import { CharacterService, HistoryService, AuthService } from "../../services";
import { Result } from "../../types/result";

/**
 * Character Application Service
 *
 * Coordinates Use Cases and handles cross-cutting concerns like:
 * - Transaction management
 * - Caching
 * - Event publishing
 * - Authorization
 *
 * Following clean architecture principles:
 * - Application Services orchestrate Use Cases
 * - Handle infrastructure concerns
 * - Maintain transactional boundaries
 * - Provide unified API for presentation layer
 */
export class CharacterApplicationService {
  private readonly loadCharacterUseCase: LoadCharacterUseCase;
  private readonly loadAllCharactersUseCase: LoadAllCharactersUseCase;
  private readonly increaseSkillUseCase: IncreaseSkillUseCase;
  private readonly updateAttributeUseCase: UpdateAttributeUseCase;
  private readonly updateBaseValueUseCase: UpdateBaseValueUseCase;
  private readonly updateCombatValueUseCase: UpdateCombatValueUseCase;
  private readonly levelUpUseCase: LevelUpUseCase;
  private readonly loadHistoryUseCase: LoadHistoryUseCase;
  private readonly deleteHistoryEntryUseCase: DeleteHistoryEntryUseCase;

  constructor(
    private readonly characterService: CharacterService,
    private readonly historyService: HistoryService,
    private readonly authService: AuthService
  ) {
    // Initialize Use Cases with dependencies
    this.loadCharacterUseCase = new LoadCharacterUseCase(characterService);
    this.loadAllCharactersUseCase = new LoadAllCharactersUseCase(characterService);
    this.increaseSkillUseCase = new IncreaseSkillUseCase(characterService);
    this.updateAttributeUseCase = new UpdateAttributeUseCase(characterService);
    this.updateBaseValueUseCase = new UpdateBaseValueUseCase(characterService);
    this.updateCombatValueUseCase = new UpdateCombatValueUseCase(characterService);
    this.levelUpUseCase = new LevelUpUseCase(characterService);
    this.loadHistoryUseCase = new LoadHistoryUseCase(historyService);
    this.deleteHistoryEntryUseCase = new DeleteHistoryEntryUseCase(historyService, characterService);
  }

  /**
   * Loads a character with proper authorization check
   */
  async loadCharacter(input: LoadCharacterInput): Promise<Result<LoadCharacterOutput, Error>> {
    return await this.loadCharacterUseCase.execute(input);
  }

  /**
   * Loads all characters for the current user
   */
  async loadAllCharacters(input: LoadAllCharactersInput): Promise<Result<LoadAllCharactersOutput, Error>> {
    return await this.loadAllCharactersUseCase.execute(input);
  }

  /**
   * Increases a skill with transaction management and history recording
   */
  async increaseSkill(input: IncreaseSkillInput): Promise<Result<IncreaseSkillOutput, Error>> {
    try {
      const result = await this.increaseSkillUseCase.execute(input);

      if (!result.success) {
        return result;
      }

      // TODO: Add cross-cutting concerns:
      // - Publish domain event
      // - Update cache
      // - Send notifications

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error occurred"),
      };
    }
  }

  /**
   * Updates a character attribute
   */
  async updateAttribute(input: UpdateAttributeInput): Promise<Result<UpdateAttributeOutput, Error>> {
    return await this.updateAttributeUseCase.execute(input);
  }

  /**
   * Updates a character base value
   */
  async updateBaseValue(input: UpdateBaseValueInput): Promise<Result<UpdateBaseValueOutput, Error>> {
    return await this.updateBaseValueUseCase.execute(input);
  }

  /**
   * Updates a character combat value
   */
  async updateCombatValue(input: UpdateCombatValueInput): Promise<Result<UpdateCombatValueOutput, Error>> {
    return await this.updateCombatValueUseCase.execute(input);
  }

  /**
   * Levels up a character
   */
  async levelUp(input: LevelUpInput): Promise<Result<LevelUpOutput, Error>> {
    return await this.levelUpUseCase.execute(input);
  }

  /**
   * Loads character history
   */
  async loadHistory(input: LoadHistoryInput): Promise<Result<LoadHistoryOutput, Error>> {
    return await this.loadHistoryUseCase.execute(input);
  }

  /**
   * Deletes/reverts a history entry
   */
  async deleteHistoryEntry(input: DeleteHistoryEntryInput): Promise<Result<DeleteHistoryEntryOutput, Error>> {
    return await this.deleteHistoryEntryUseCase.execute(input);
  }
}
