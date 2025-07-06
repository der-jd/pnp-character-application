import { CalculationPoints } from "../Character/character";

export interface Increase {
  initialValue: number;
  increasedPoints: number;
}

export interface PointsAvailable {
  old: CalculationPoints;
  new: CalculationPoints;
}
