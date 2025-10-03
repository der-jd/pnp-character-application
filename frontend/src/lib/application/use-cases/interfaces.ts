import { Result } from '../../types/result';
import { Character } from 'api-spec';
import { Character as DomainCharacter } from '../../domain/Character';

/**
 * Base interface for all Use Cases
 * Enforces clean architecture boundaries and consistent error handling
 * Following coding guidelines for proper abstraction layers
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, Error>>;
}

/**
 * Base interface for Use Cases that don't require input parameters
 */
export interface NoInputUseCase<TOutput> {
  execute(): Promise<Result<TOutput, Error>>;
}

/**
 * Use Case input/output types for character operations
 */
export interface LoadCharacterInput {
  characterId: string;
  idToken: string;
}

export interface LoadAllCharactersInput {
  idToken: string;
}

export interface IncreaseSkillInput {
  characterId: string;
  skillName: string;
  idToken: string;
}

export interface UpdateAttributeInput {
  characterId: string;
  attributeName: string;
  newValue: number;
  idToken: string;
}

export interface UpdateBaseValueInput {
  characterId: string;
  baseValueName: string;
  newValue: number;
  idToken: string;
}

export interface UpdateCombatValueInput {
  characterId: string;
  combatType: 'melee' | 'ranged';
  combatValueName: string;
  newAttackValue: number;
  idToken: string;
}

export interface LevelUpInput {
  characterId: string;
  currentLevel: number;
  idToken: string;
}

export interface LoadHistoryInput {
  characterId: string;
  idToken: string;
}

export interface DeleteHistoryEntryInput {
  characterId: string;
  historyEntryId: string;
  idToken: string;
}

export interface CreateCharacterInput {
  characterData: any; // Will be typed with PostCharactersRequest
  idToken: string;
}

export interface CloneCharacterInput {
  sourceCharacterId: string;
  idToken: string;
}

export interface AddSpecialAbilityInput {
  characterId: string;
  specialAbilityName: string;
  idToken: string;
}

export interface UpdateCalculationPointsInput {
  characterId: string;
  adventurePoints?: {
    start?: { initialValue: number; newValue: number };
    total?: { initialValue: number; increasedPoints: number };
  };
  attributePoints?: {
    start?: { initialValue: number; newValue: number };
    total?: { initialValue: number; increasedPoints: number };
  };
  idToken: string;
}

export interface AddHistoryRecordInput {
  characterId: string;
  changeType: string;
  changeDescription: string;
  idToken: string;
}

/**
 * Use Case output types - all properly typed using api-spec and domain classes
 */
export interface LoadCharacterOutput {
  character: DomainCharacter;
}

export interface LoadAllCharactersOutput {
  characters: DomainCharacter[];
}

export interface IncreaseSkillOutput {
  updatedCharacter: DomainCharacter;
  costCalculation: {
    oldValue: number;
    newValue: number;
    cost: number;
  };
}

export interface UpdateAttributeOutput {
  updatedCharacter: DomainCharacter;
}

export interface UpdateBaseValueOutput {
  updatedCharacter: DomainCharacter;
}

export interface UpdateCombatValueOutput {
  updatedCharacter: DomainCharacter;
}

export interface LevelUpOutput {
  updatedCharacter: DomainCharacter;
  newLevel: number;
  pointsGained: {
    adventurePoints: number;
    attributePoints: number;
  };
}

export interface LoadHistoryOutput {
  historyEntries: Array<{
    id: string;
    characterId: string;
    changeType: string;
    changeDescription: string;
    timestamp: string;
    isReverted: boolean;
  }>;
}

export interface DeleteHistoryEntryOutput {
  success: boolean;
  revertedCharacter: DomainCharacter;
}

export interface CreateCharacterOutput {
  createdCharacter: DomainCharacter;
  characterId: string;
}

export interface CloneCharacterOutput {
  clonedCharacter: DomainCharacter;
  characterId: string;
}

export interface AddSpecialAbilityOutput {
  updatedCharacter: DomainCharacter;
  addedAbility: string;
}

export interface UpdateCalculationPointsOutput {
  updatedCharacter: DomainCharacter;
  pointsChanged: {
    adventurePoints?: number;
    attributePoints?: number;
  };
}

export interface AddHistoryRecordOutput {
  recordId: string;
  success: boolean;
}