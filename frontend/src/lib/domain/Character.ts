import type { Character as ApiCharacter, CharacterSheet } from "api-spec";
import { SkillCollection } from "./Skills";
import { AttributeCollection } from "./Attributes";
import { CombatValueCollection } from "./CombatValues";
import { BaseValueCollection } from "./BaseValues";

/**
 * Domain model for a Character that encapsulates business logic
 * and provides a clean interface for the UI layer.
 */
export class Character {
  private _skillCollection: SkillCollection;
  private _attributeCollection: AttributeCollection;
  private _combatValueCollection: CombatValueCollection;
  private _baseValueCollection: BaseValueCollection;

  private constructor(
    private readonly _userId: string,
    private readonly _characterId: string,
    private _characterSheet: CharacterSheet
  ) {
    this._skillCollection = new SkillCollection(_characterSheet.skills);
    this._attributeCollection = new AttributeCollection(_characterSheet.attributes);
    this._combatValueCollection = new CombatValueCollection(_characterSheet.combat);
    this._baseValueCollection = new BaseValueCollection(_characterSheet.baseValues);
  }

  /**
   * Creates a Character domain object from API data
   */
  static fromApiData(apiData: ApiCharacter): Character {
    return new Character(
      apiData.userId,
      apiData.characterId,
      apiData.characterSheet
    );
  }

  // === Getters ===
  get userId(): string {
    return this._userId;
  }

  get characterId(): string {
    return this._characterId;
  }

  get name(): string {
    return this._characterSheet.generalInformation.name;
  }

  get level(): number {
    return this._characterSheet.generalInformation.level;
  }

  get adventurePoints(): number {
    return this._characterSheet.calculationPoints.adventurePoints.available;
  }

  get attributePoints(): number {
    return this._characterSheet.calculationPoints.attributePoints.available;
  }

  // === Collection Getters ===
  get skills(): SkillCollection {
    return this._skillCollection;
  }

  get attributes(): AttributeCollection {
    return this._attributeCollection;
  }

  get combatValues(): CombatValueCollection {
    return this._combatValueCollection;
  }

  get baseValues(): BaseValueCollection {
    return this._baseValueCollection;
  }

  // === Business Logic Methods ===
  // Note: All calculation methods should be handled by backend API
  // Frontend only displays data and collects user input

  /**
   * Updates the character sheet data (used after successful API calls)
   */
  updateCharacterSheet(newData: CharacterSheet): void {
    this._characterSheet = newData;
    this._skillCollection = new SkillCollection(newData.skills);
    this._attributeCollection = new AttributeCollection(newData.attributes);
    this._combatValueCollection = new CombatValueCollection(newData.combat);
    this._baseValueCollection = new BaseValueCollection(newData.baseValues);
  }

  /**
   * Gets the raw character sheet data (for API calls)
   */
  toApiData(): ApiCharacter {
    return {
      userId: this._userId,
      characterId: this._characterId,
      characterSheet: this._characterSheet
    };
  }

  /**
   * Creates a summary representation for character lists
   */
  toSummary() {
    return {
      characterId: this._characterId,
      name: this.name,
      level: this.level,
      userId: this._userId
    };
  }
}