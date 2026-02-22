import type { CombatSection, CombatStats } from "api-spec";

export interface CombatValueViewModel {
  readonly name: string;
  readonly displayName: string;
  readonly type: "melee" | "ranged";
  readonly handling: number;
  readonly attackValue: number;
  readonly skilledAttackValue: number;
  readonly paradeValue: number;
  readonly skilledParadeValue: number;
  readonly availablePoints: number;
}

/**
 * Collection class for managing combat values with business logic
 */
export class CombatValueCollection {
  constructor(private combat: CombatSection) {}

  /**
   * Gets all combat values as view models
   */
  getAllCombatValues(): CombatValueViewModel[] {
    const combatValues: CombatValueViewModel[] = [];

    // Process melee combat values
    Object.entries(this.combat.melee).forEach(([name, stats]) => {
      combatValues.push(this.createCombatValueViewModel(name, "melee", stats));
    });

    // Process ranged combat values
    Object.entries(this.combat.ranged).forEach(([name, stats]) => {
      combatValues.push(this.createCombatValueViewModel(name, "ranged", stats));
    });

    return combatValues;
  }

  /**
   * Gets only melee combat values
   */
  getMeleeCombatValues(): CombatValueViewModel[] {
    return Object.entries(this.combat.melee).map(([name, stats]) =>
      this.createCombatValueViewModel(name, "melee", stats)
    );
  }

  /**
   * Gets only ranged combat values
   */
  getRangedCombatValues(): CombatValueViewModel[] {
    return Object.entries(this.combat.ranged).map(([name, stats]) =>
      this.createCombatValueViewModel(name, "ranged", stats)
    );
  }

  /**
   * Gets a specific combat value
   */
  getCombatValue(type: "melee" | "ranged", name: string): CombatValueViewModel | null {
    if (!this.combat[type]) {
      return null;
    }
    const stats = this.combat[type][name as keyof (typeof this.combat)[typeof type]];
    return stats ? this.createCombatValueViewModel(name, type, stats) : null;
  }

  private createCombatValueViewModel(name: string, type: "melee" | "ranged", stats: CombatStats): CombatValueViewModel {
    return {
      name,
      displayName: this.formatCombatValueName(name),
      type,
      handling: stats.handling,
      attackValue: stats.attackValue,
      skilledAttackValue: stats.skilledAttackValue,
      paradeValue: stats.paradeValue,
      skilledParadeValue: stats.skilledParadeValue,
      availablePoints: stats.availablePoints,
    };
  }

  /**
   * Gets the best combat values based on attack value
   */
  getBestMeleeCombatValues(limit: number): CombatValueViewModel[] {
    return this.getMeleeCombatValues()
      .sort((a, b) => b.attackValue - a.attackValue)
      .slice(0, limit);
  }

  /**
   * Gets the best ranged combat values based on attack value
   */
  getBestRangedCombatValues(limit: number): CombatValueViewModel[] {
    return this.getRangedCombatValues()
      .sort((a, b) => b.attackValue - a.attackValue)
      .slice(0, limit);
  }

  /**
   * Calculates total available points across all combat values
   */
  getTotalAvailablePoints(): number {
    return this.getAllCombatValues().reduce((total, combatValue) => total + combatValue.availablePoints, 0);
  }

  private formatCombatValueName(name: string): string {
    // Convert camelCase to readable format
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/1h/g, " (1H)")
      .replace(/2h/g, " (2H)")
      .trim();
  }
}
