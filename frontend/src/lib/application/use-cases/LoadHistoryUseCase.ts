import { UseCase, LoadHistoryInput, LoadHistoryOutput } from './interfaces';
import { Result, ResultSuccess, ResultError } from '../../types/result';
import { HistoryService } from '../../services/historyService';

/**
 * Use Case for loading character history
 * 
 * Business Rules:
 * - Loads complete history including all blocks
 * - Transforms raw history data for presentation
 * - Handles pagination of history blocks
 * - Validates user access to character history
 * 
 * Following clean architecture principles:
 * - Application layer coordinates business logic
 * - Domain services handle external interactions
 * - Proper transformation of data for presentation layer
 */
export class LoadHistoryUseCase implements UseCase<LoadHistoryInput, LoadHistoryOutput> {
  constructor(private readonly historyService: HistoryService) {}

  async execute(input: LoadHistoryInput): Promise<Result<LoadHistoryOutput, Error>> {
    try {
      // Validate input at application boundary
      if (!input.characterId) {
        return ResultError(new Error('Character ID is required'));
      }
      
      if (!input.idToken) {
        return ResultError(new Error('Authentication token is required'));
      }

      // Load complete history using domain service
      const result = await this.historyService.getHistory(input.characterId, input.idToken);
      
      if (!result.success) {
        return ResultError(new Error(`Failed to load history: ${result.error.message}`));
      }

      // Transform history data for presentation
      const historyEntries = this.transformHistoryEntries(result.data);

      // Return application-layer result
      return ResultSuccess({
        historyEntries: historyEntries
      });
    } catch (error) {
      return ResultError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  }

  /**
   * Transforms raw history response into presentation-friendly format
   */
  private transformHistoryEntries(historyResponse: any): Array<{
    id: string;
    characterId: string;
    changeType: string;
    changeDescription: string;
    timestamp: string;
    isReverted: boolean;
  }> {
    // Safely handle the history data structure
    if (!historyResponse || !historyResponse.data) {
      return [];
    }

    const entries = historyResponse.data.changes || [];
    
    return entries.map((entry: any, index: number) => ({
      id: entry.id || `entry-${index}`,
      characterId: entry.characterId || '',
      changeType: entry.changeType || 'unknown',
      changeDescription: this.formatChangeDescription(entry),
      timestamp: entry.timestamp || new Date().toISOString(),
      isReverted: entry.isReverted || false
    }));
  }

  /**
   * Formats change description for display
   */
  private formatChangeDescription(entry: any): string {
    if (entry.changeDescription) {
      return entry.changeDescription;
    }

    // Generate description based on change type
    switch (entry.changeType) {
      case 'skill_increase':
        return `Increased ${entry.skillName || 'skill'} to ${entry.newValue || 'unknown'}`;
      case 'attribute_increase':
        return `Increased ${entry.attributeName || 'attribute'} to ${entry.newValue || 'unknown'}`;
      case 'level_up':
        return `Leveled up to level ${entry.newLevel || 'unknown'}`;
      default:
        return 'Character change';
    }
  }
}