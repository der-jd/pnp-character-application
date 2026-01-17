/**
 * Character Summary - Lightweight character representation
 * Used for character lists and selection dropdowns
 */
export interface CharacterSummaryData {
  userId: string;
  characterId: string;
  name: string;
  level: number;
}

/**
 * CharacterSummary domain model
 * Represents a lightweight version of a character for lists and selections
 */
export class CharacterSummary {
  constructor(
    public readonly userId: string,
    public readonly characterId: string,
    public readonly name: string,
    public readonly level: number
  ) {}

  /**
   * Create CharacterSummary from API short character data
   */
  static fromApiShortData(apiData: CharacterSummaryData): CharacterSummary {
    return new CharacterSummary(apiData.userId, apiData.characterId, apiData.name, apiData.level);
  }

  /**
   * Convert to plain object for API/presentation layer
   */
  toData(): CharacterSummaryData {
    return {
      userId: this.userId,
      characterId: this.characterId,
      name: this.name,
      level: this.level,
    };
  }
}
