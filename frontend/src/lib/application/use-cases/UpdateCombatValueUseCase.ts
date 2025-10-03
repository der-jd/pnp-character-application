import { UseCase, UpdateCombatValueInput, UpdateCombatValueOutput } from './interfaces';
import { Result, ResultSuccess, ResultError } from '../../types/result';
import { CharacterService } from '../../services/characterService';

/**
 * Use Case for updating a character's combat value
 * 
 * Business Rules:
 * - Validates combat value exists and can be updated
 * - Calculates point costs according to game rules
 * - Updates character through domain service
 * - Ensures character has sufficient points
 * 
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle complex operations
 * - All types from api-spec for consistency
 */
export class UpdateCombatValueUseCase implements UseCase<UpdateCombatValueInput, UpdateCombatValueOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: UpdateCombatValueInput): Promise<Result<UpdateCombatValueOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error('Character ID is required'));
      }
      
      if (!input.combatValueName) {
        return ResultError(new Error('Combat value name is required'));
      }
      
      if (!input.combatType) {
        return ResultError(new Error('Combat type (melee/ranged) is required'));
      }
      
      if (!input.idToken) {
        return ResultError(new Error('Authentication token is required'));
      }

      if (input.newAttackValue < 0) {
        return ResultError(new Error('Combat value cannot be negative'));
      }

      // Load current character to validate combat value exists
      const characterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!characterResult.success) {
        return ResultError(new Error(`Failed to load character: ${characterResult.error.message}`));
      }

      const character = characterResult.data;
      
      // Validate combat value exists through the combat value collection
      const combatValueViewModel = character.combatValues.getCombatValue(input.combatType, input.combatValueName);
      if (!combatValueViewModel) {
        return ResultError(new Error(`Combat value '${input.combatValueName}' not found on character`));
      }

      const currentValue = combatValueViewModel.attackValue;
      const pointsToIncrease = input.newAttackValue - currentValue;

      // Validate character has enough adventure points (business rule)
      if (pointsToIncrease > 0 && character.adventurePoints < pointsToIncrease) {
        return ResultError(new Error('Insufficient adventure points for this increase'));
      }

      // Execute combat value update through domain service using proper api-spec format
      const updateResult = await this.characterService.updateCombatStats(
        input.characterId,
        input.combatType,
        input.combatValueName,
        { 
          skilledAttackValue: { 
            initialValue: currentValue, 
            increasedPoints: input.newAttackValue - currentValue
          },
          skilledParadeValue: { 
            initialValue: combatValueViewModel.skilledParadeValue, 
            increasedPoints: 0  // Only updating attack value in this use case
          }
        },
        input.idToken
      );

      if (!updateResult.success) {
        return ResultError(new Error(`Failed to update combat value: ${updateResult.error.message}`));
      }

      // Reload character to get updated state
      const updatedCharacterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!updatedCharacterResult.success) {
        return ResultError(new Error('Combat value updated but failed to reload character'));
      }

      // Return application-layer result
      return ResultSuccess({
        updatedCharacter: updatedCharacterResult.data
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  }
}