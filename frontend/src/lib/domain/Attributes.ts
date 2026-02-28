import type { Attribute, CharacterSheet } from "api-spec";

export interface AttributeViewModel {
  readonly name: string;
  readonly displayName: string;
  readonly currentValue: number;
  readonly startValue: number;
  readonly modifier: number;
  readonly totalCost: number;
}

/**
 * Collection class for managing character attributes with business logic
 */
export class AttributeCollection {
  constructor(private attributes: CharacterSheet["attributes"]) {}

  /**
   * Gets all attributes as view models
   */
  getAllAttributes(): AttributeViewModel[] {
    return Object.entries(this.attributes).map(([name, attribute]) => this.createAttributeViewModel(name, attribute));
  }

  /**
   * Gets a specific attribute
   */
  getAttribute(name: string): AttributeViewModel | null {
    const attribute = this.attributes[name as keyof CharacterSheet["attributes"]];
    return attribute ? this.createAttributeViewModel(name, attribute) : null;
  }

  /**
   * Gets the primary attributes (commonly used ones)
   */
  getPrimaryAttributes(): AttributeViewModel[] {
    const primaryAttributeNames = [
      "courage",
      "intelligence",
      "concentration",
      "charisma",
      "mentalResilience",
      "dexterity",
      "endurance",
      "strength",
    ];
    return primaryAttributeNames
      .map((name) => this.getAttribute(name))
      .filter((attr): attr is AttributeViewModel => attr !== null);
  }

  /**
   * Gets the total attribute points spent
   */
  getTotalAttributePointsSpent(): number {
    return Object.values(this.attributes).reduce((total, attribute) => total + attribute.totalCost, 0);
  }

  private createAttributeViewModel(name: string, attribute: Attribute): AttributeViewModel {
    return {
      name,
      displayName: this.formatAttributeName(name),
      currentValue: attribute.current,
      startValue: attribute.start,
      modifier: attribute.mod,
      totalCost: attribute.totalCost,
    };
  }

  private formatAttributeName(name: string): string {
    // Convert camelCase to readable format
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}
