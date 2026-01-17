import { UseCase, UpdateAttributeInput, UpdateAttributeOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { CharacterService } from "../../services/characterService";

/**
 * Use Case for updating a character's attribute
 *
 * Business Rules:
 * - Validates attribute exists and can be updated
 * - Calculates point costs according to game rules
 * - Updates character through domain service
 * - Ensures character has sufficient points
 *
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle complex operations
 * - All types from api-spec for consistency
 */
export class UpdateAttributeUseCase implements UseCase<UpdateAttributeInput, UpdateAttributeOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: UpdateAttributeInput): Promise<Result<UpdateAttributeOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error("Character ID is required"));
      }

      if (!input.attributeName) {
        return ResultError(new Error("Attribute name is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      if (input.newValue < 0) {
        return ResultError(new Error("Attribute value cannot be negative"));
      }

      // Load current character to validate attribute exists
      const characterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!characterResult.success) {
        return ResultError(new Error(`Failed to load character: ${characterResult.error.message}`));
      }

      const character = characterResult.data;

      // Validate attribute exists through the attribute collection
      const attributeViewModel = character.attributes.getAttribute(input.attributeName);
      if (!attributeViewModel) {
        return ResultError(new Error(`Attribute '${input.attributeName}' not found on character`));
      }

      const currentValue = attributeViewModel.currentValue;
      const pointsToIncrease = input.newValue - currentValue;

      // Validate character has enough attribute points (business rule)
      if (pointsToIncrease > 0 && character.attributePoints < pointsToIncrease) {
        return ResultError(new Error("Insufficient attribute points for this increase"));
      }

      // Execute attribute update through domain service using proper api-spec format
      const updateResult = await this.characterService.updateAttribute(
        input.characterId,
        input.attributeName,
        {
          current: {
            initialValue: currentValue,
            increasedPoints: pointsToIncrease,
          },
        },
        input.idToken
      );

      if (!updateResult.success) {
        return ResultError(new Error(`Failed to update attribute: ${updateResult.error.message}`));
      }

      // Reload character to get updated state
      const updatedCharacterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!updatedCharacterResult.success) {
        return ResultError(new Error("Attribute updated but failed to reload character"));
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
