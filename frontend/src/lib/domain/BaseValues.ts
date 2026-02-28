import type { BaseValue, CharacterSheet } from "api-spec";

export interface BaseValueViewModel {
  readonly name: string;
  readonly displayName: string;
  readonly currentValue: number;
  readonly startValue: number;
  readonly byFormula?: number;
  readonly byLvlUp?: number;
  readonly modifier: number;
}

/**
 * Collection class for managing character base values with business logic
 */
export class BaseValueCollection {
  constructor(private baseValues: CharacterSheet["baseValues"]) {}

  /**
   * Gets all base values as view models
   */
  getAllBaseValues(): BaseValueViewModel[] {
    return Object.entries(this.baseValues).map(([name, baseValue]) => this.createBaseValueViewModel(name, baseValue));
  }

  /**
   * Gets a specific base value
   */
  getBaseValue(name: string): BaseValueViewModel | null {
    const baseValue = this.baseValues[name as keyof CharacterSheet["baseValues"]];
    return baseValue ? this.createBaseValueViewModel(name, baseValue) : null;
  }

  /**
   * Gets essential base values (commonly displayed ones)
   */
  getEssentialBaseValues(): BaseValueViewModel[] {
    const essentialNames = ["healthPoints", "mentalHealth", "luckPoints", "initiativeBaseValue"];
    return essentialNames.map((name) => this.getBaseValue(name)).filter((bv): bv is BaseValueViewModel => bv !== null);
  }

  private createBaseValueViewModel(name: string, baseValue: BaseValue): BaseValueViewModel {
    return {
      name,
      displayName: this.formatBaseValueName(name),
      currentValue: baseValue.current,
      startValue: baseValue.start,
      byFormula: baseValue.byFormula,
      byLvlUp: baseValue.byLvlUp,
      modifier: baseValue.mod,
    };
  }

  private formatBaseValueName(name: string): string {
    // Convert camelCase to readable format
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}
