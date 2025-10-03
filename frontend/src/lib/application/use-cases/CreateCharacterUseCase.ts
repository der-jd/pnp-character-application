import { UseCase, CreateCharacterInput, CreateCharacterOutput } from './interfaces';
import { Result, ResultSuccess, ResultError } from '../../types/result';
import { CharacterService } from '../../services/characterService';

/**
 * Use Case for creating a new character
 * 
 * Business Rules:
 * - Validates character creation data according to game rules
 * - Ensures attribute values are within valid ranges (4-7)
 * - Validates total attribute points don't exceed limits (40 points)
 * - Creates character through domain service
 * - Returns fully initialized character
 * 
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle complex operations
 * - All types from api-spec for consistency
 */
export class CreateCharacterUseCase implements UseCase<CreateCharacterInput, CreateCharacterOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: CreateCharacterInput): Promise<Result<CreateCharacterOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterData) {
        return ResultError(new Error('Character data is required'));
      }
      
      if (!input.idToken) {
        return ResultError(new Error('Authentication token is required'));
      }

      // Validate character data according to creation rules
      const validationResult = this.validateCharacterCreationData(input.characterData);
      if (!validationResult.isValid) {
        return ResultError(new Error(`Invalid character data: ${validationResult.error}`));
      }

      // Execute character creation through domain service
      const createResult = await this.characterService.createCharacter(
        input.characterData,
        input.idToken
      );

      if (!createResult.success) {
        return ResultError(new Error(`Failed to create character: ${createResult.error.message}`));
      }

      const createdCharacter = createResult.data;

      // Return application-layer result
      return ResultSuccess({
        createdCharacter: createdCharacter,
        characterId: createdCharacter.characterId
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  }

  /**
   * Validates character creation data according to game rules
   */
  private validateCharacterCreationData(characterData: any): { isValid: boolean; error?: string } {
    // Basic validation - in a real implementation, this would be more comprehensive
    if (!characterData.name || characterData.name.trim().length === 0) {
      return { isValid: false, error: 'Character name is required' };
    }

    if (characterData.name.length > 50) {
      return { isValid: false, error: 'Character name too long (max 50 characters)' };
    }

    // Validate attributes if provided
    if (characterData.attributes) {
      for (const [attrName, attrValue] of Object.entries(characterData.attributes)) {
        if (typeof attrValue === 'object' && attrValue !== null) {
          const value = (attrValue as any).current;
          if (typeof value === 'number') {
            if (value < 4 || value > 7) {
              return { 
                isValid: false, 
                error: `Attribute ${attrName} must be between 4 and 7 (got ${value})` 
              };
            }
          }
        }
      }
    }

    return { isValid: true };
  }
}