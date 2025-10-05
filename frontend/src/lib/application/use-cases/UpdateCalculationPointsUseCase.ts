import { UseCase, UpdateCalculationPointsInput, UpdateCalculationPointsOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { CharacterService } from "../../services/characterService";
import { PatchCalculationPointsRequest } from "api-spec";

/**
 * Use Case for updating character calculation points (adventure points, attribute points)
 *
 * Business Rules:
 * - Validates point adjustments are reasonable
 * - Prevents negative point values
 * - Updates character through domain service
 * - Maintains point consistency
 *
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle complex operations
 * - All types from api-spec for consistency
 */
export class UpdateCalculationPointsUseCase
  implements UseCase<UpdateCalculationPointsInput, UpdateCalculationPointsOutput>
{
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: UpdateCalculationPointsInput): Promise<Result<UpdateCalculationPointsOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error("Character ID is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      if (!input.adventurePoints && !input.attributePoints) {
        return ResultError(new Error("At least one point type update is required"));
      }

      // Load current character to validate current state
      const characterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!characterResult.success) {
        return ResultError(new Error(`Failed to load character: ${characterResult.error.message}`));
      }

      // Validate point updates don't result in negative values
      if (input.adventurePoints?.total) {
        const newTotal = input.adventurePoints.total.initialValue + input.adventurePoints.total.increasedPoints;
        if (newTotal < 0) {
          return ResultError(new Error("Adventure points cannot be negative"));
        }
      }

      if (input.attributePoints?.total) {
        const newTotal = input.attributePoints.total.initialValue + input.attributePoints.total.increasedPoints;
        if (newTotal < 0) {
          return ResultError(new Error("Attribute points cannot be negative"));
        }
      }

      // Prepare the update request according to api-spec format
      const updateData: Partial<PatchCalculationPointsRequest> = {};

      if (input.adventurePoints) {
        updateData.adventurePoints = input.adventurePoints;
      }

      if (input.attributePoints) {
        updateData.attributePoints = input.attributePoints;
      }

      // Execute calculation points update through domain service
      // Note: We need to add this method to CharacterService
      const updateResult = await this.updateCalculationPointsViaService(input.characterId, updateData, input.idToken);

      if (!updateResult.success) {
        return ResultError(new Error(`Failed to update calculation points: ${updateResult.error}`));
      }

      // Reload character to get updated state
      const updatedCharacterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!updatedCharacterResult.success) {
        return ResultError(new Error("Points updated but failed to reload character"));
      }

      // Calculate changes for response
      const pointsChanged: Record<string, number> = {};
      if (input.adventurePoints?.total) {
        pointsChanged.adventurePoints = input.adventurePoints.total.increasedPoints;
      }
      if (input.attributePoints?.total) {
        pointsChanged.attributePoints = input.attributePoints.total.increasedPoints;
      }

      // Return application-layer result
      return ResultSuccess({
        updatedCharacter: updatedCharacterResult.data,
        pointsChanged: pointsChanged,
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }

  /**
   * Helper method to update calculation points via service
   */
  private async updateCalculationPointsViaService(
    characterId: string,
    updateData: Partial<PatchCalculationPointsRequest>,
    idToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.characterService.updateCalculationPoints(characterId, updateData, idToken);
      return {
        success: result.success,
        error: result.success ? undefined : result.error.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
