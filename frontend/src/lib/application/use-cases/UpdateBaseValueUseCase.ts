import { UseCase, UpdateBaseValueInput, UpdateBaseValueOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { CharacterService } from "../../services/characterService";

/**
 * Use Case for updating a character's base value
 *
 * Business Rules:
 * - Validates base value exists and can be updated
 * - Calculates point costs according to game rules
 * - Updates character through domain service
 * - Ensures character has sufficient points
 *
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle complex operations
 * - All types from api-spec for consistency
 */
export class UpdateBaseValueUseCase implements UseCase<UpdateBaseValueInput, UpdateBaseValueOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: UpdateBaseValueInput): Promise<Result<UpdateBaseValueOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error("Character ID is required"));
      }

      if (!input.baseValueName) {
        return ResultError(new Error("Base value name is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      if (input.newValue < 0) {
        return ResultError(new Error("Base value cannot be negative"));
      }

      // Load current character to validate base value exists
      const characterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!characterResult.success) {
        return ResultError(new Error(`Failed to load character: ${characterResult.error.message}`));
      }

      const character = characterResult.data;

      // Validate base value exists through the base value collection
      const baseValueViewModel = character.baseValues.getBaseValue(input.baseValueName);
      if (!baseValueViewModel) {
        return ResultError(new Error(`Base value '${input.baseValueName}' not found on character`));
      }

      const currentValue = baseValueViewModel.currentValue;
      const pointsToIncrease = input.newValue - currentValue;

      // Validate character has enough adventure points (business rule)
      if (pointsToIncrease > 0 && character.adventurePoints < pointsToIncrease) {
        return ResultError(new Error("Insufficient adventure points for this increase"));
      }

      // Execute base value update through domain service using proper api-spec format
      const updateResult = await this.characterService.updateBaseValue(
        input.characterId,
        input.baseValueName,
        {
          start: {
            initialValue: currentValue,
            newValue: input.newValue,
          },
        },
        input.idToken
      );

      if (!updateResult.success) {
        return ResultError(new Error(`Failed to update base value: ${updateResult.error.message}`));
      }

      // Reload character to get updated state
      const updatedCharacterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!updatedCharacterResult.success) {
        return ResultError(new Error("Base value updated but failed to reload character"));
      }

      // Return application-layer result
      return ResultSuccess({
        updatedCharacter: updatedCharacterResult.data,
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }
}
