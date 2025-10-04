import { UseCase, IncreaseSkillInput, IncreaseSkillOutput } from "./interfaces";
import { Result, ResultSuccess, ResultError } from "../../types/result";
import { CharacterService } from "../../services/characterService";

/**
 * Use Case for increasing a character's skill
 *
 * Business Rules:
 * - Validates skill exists and can be increased
 * - Calculates cost according to game rules
 * - Updates character through domain service
 * - Returns both updated character and cost information
 *
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle complex operations
 * - All types from api-spec for consistency
 */
export class IncreaseSkillUseCase implements UseCase<IncreaseSkillInput, IncreaseSkillOutput> {
  constructor(private readonly characterService: CharacterService) {}

  async execute(input: IncreaseSkillInput): Promise<Result<IncreaseSkillOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error("Character ID is required"));
      }

      if (!input.skillName) {
        return ResultError(new Error("Skill name is required"));
      }

      if (!input.idToken) {
        return ResultError(new Error("Authentication token is required"));
      }

      // Load current character to validate skill exists and get current value
      const characterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!characterResult.success) {
        return ResultError(new Error(`Failed to load character: ${characterResult.error.message}`));
      }

      const character = characterResult.data;

      // Parse skill name to extract category and skill name (expecting format: "category.skillName")
      const { category, skillName } = this.parseSkillIdentifier(input.skillName);

      // Validate skill exists through the skill collection
      const skillViewModel = character.skills.getSkill(category, skillName);
      if (!skillViewModel) {
        return ResultError(new Error(`Skill '${input.skillName}' not found on character`));
      }

      const currentValue = skillViewModel.currentLevel;

      // Validate character has enough adventure points (business rule)
      if (character.adventurePoints <= 0) {
        return ResultError(new Error("Insufficient adventure points for skill increase"));
      }

      // Execute skill increase through domain service using proper api-spec format
      const updateResult = await this.characterService.updateSkill(
        input.characterId,
        category,
        skillName,
        {
          current: {
            initialValue: currentValue,
            increasedPoints: 1,
          },
        },
        input.idToken,
      );

      if (!updateResult.success) {
        return ResultError(new Error(`Failed to increase skill: ${updateResult.error.message}`));
      }

      // Extract cost and new value from backend response
      const responseData = updateResult.data.data;
      const newValue = responseData.changes.new.skill.current;

      // Calculate cost from old vs new adventure points
      const adventurePointsOld = responseData.adventurePoints.old.available;
      const adventurePointsNew = responseData.adventurePoints.new.available;
      const cost = adventurePointsOld - adventurePointsNew;

      // Reload character to get updated state
      const updatedCharacterResult = await this.characterService.getCharacter(input.characterId, input.idToken);
      if (!updatedCharacterResult.success) {
        return ResultError(new Error("Skill updated but failed to reload character"));
      }

      // Return application-layer result with proper cost calculation from backend
      return ResultSuccess({
        updatedCharacter: updatedCharacterResult.data,
        costCalculation: {
          oldValue: currentValue,
          newValue: newValue,
          cost: cost,
        },
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error("Unknown error occurred"));
    }
  }

  /**
   * Parses skill identifier into category and skill name
   * Expected format: "category.skillName" or just "skillName" (defaults to 'combat')
   */
  private parseSkillIdentifier(skillIdentifier: string): { category: string; skillName: string } {
    const parts = skillIdentifier.split(".");
    if (parts.length === 2) {
      return { category: parts[0], skillName: parts[1] };
    }
    // Default to combat category if no category specified
    return { category: "combat", skillName: skillIdentifier };
  }
}
