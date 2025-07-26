import { CalculationPoints } from "../Character/character";

export interface Increase {
  initialValue: number;
  increasedPoints: number;
}

export interface IncreaseBaseValue {
  initialValue: number;
  newValue: number;
}

export interface PointsAvailable {
  old: CalculationPoints;
  new: CalculationPoints;
}
