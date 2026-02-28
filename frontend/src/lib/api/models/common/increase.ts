// Import types from api-spec instead of defining our own
import { InitialNew, InitialIncreased, CalculationPoints } from "api-spec";

// Re-export api-spec types for convenience
export type { InitialNew, InitialIncreased };

// Legacy interface - consider migrating to InitialIncreased
export interface Increase {
  initialValue: number;
  increasedPoints: number;
}

// Legacy interface - consider migrating to InitialNew
export interface IncreaseBaseValue {
  initialValue: number;
  newValue: number;
}

export interface PointsAvailable {
  old: CalculationPoints;
  new: CalculationPoints;
}
