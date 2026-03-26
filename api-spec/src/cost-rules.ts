import { CostCategory, LearningMethod } from "./character-schemas.js";

export const COST_CATEGORY_DEFAULT = CostCategory.CAT_2;
export const COST_CATEGORY_COMBAT_SKILLS = CostCategory.CAT_3;

export const MAX_COST_CATEGORY = CostCategory.CAT_4;
export const MIN_COST_CATEGORY = CostCategory.CAT_0;

export const SKILL_THRESHOLDS = [50, 75, Infinity];

/**
 * +------------+-------------+-------------+-------------+
 * |  Category  | Threshold 1 | Threshold 2 | Threshold 3 |
 * +------------+-------------+-------------+-------------+
 * |     0      |      0      |      0      |      0      |
 * |     1      |     0.5     |      1      |      2      |
 * |     2      |      1      |      2      |      3      |
 * |     3      |      2      |      3      |      4      |
 * |     4      |      3      |      4      |      5      |
 * +------------+-------------+-------------+-------------+
 */
export const COST_MATRIX: number[][] = [
  [0, 0, 0],
  [0.5, 1, 2],
  [1, 2, 3],
  [2, 3, 4],
  [3, 4, 5],
];

/**
 * +------------+-------------+
 * |  Category  |    Cost     |
 * +------------+-------------+
 * |     0      |      0      |
 * |     1      |     40      |
 * |     2      |     50      |
 * |     3      |     60      |
 * |     4      |     70      |
 * +------------+-------------+
 */
export const SKILL_ACTIVATION_COSTS: number[] = [0, 40, 50, 60, 70];

export function adjustCostCategory(defaultCostCategory: CostCategory, learningMethod: LearningMethod): CostCategory {
  if (learningMethod === LearningMethod.FREE) {
    return CostCategory.CAT_0;
  }

  const adjustedCategory = Number(defaultCostCategory) + Number(learningMethod);

  if (adjustedCategory > MAX_COST_CATEGORY) {
    return MAX_COST_CATEGORY;
  } else if (adjustedCategory < MIN_COST_CATEGORY) {
    return MIN_COST_CATEGORY;
  }

  return adjustedCategory as CostCategory;
}

export function getSkillIncreaseCost(skillValue: number, costCategory: CostCategory): number {
  const columnIndex = SKILL_THRESHOLDS.findIndex((threshold) => skillValue < threshold);
  return COST_MATRIX[costCategory][columnIndex];
}

export function getSkillActivationCost(costCategory: CostCategory): number {
  return SKILL_ACTIVATION_COSTS[costCategory];
}

/**
 * Calculate the total cost to increase a skill from its current value by a number of points.
 * Loops through each increment to correctly handle threshold crossings.
 */
export function calculateTotalSkillIncreaseCost(
  currentValue: number,
  increasedPoints: number,
  defaultCostCategory: CostCategory,
  learningMethod: LearningMethod,
): number {
  const adjustedCategory = adjustCostCategory(defaultCostCategory, learningMethod);
  let totalCost = 0;
  for (let i = 0; i < increasedPoints; i++) {
    totalCost += getSkillIncreaseCost(currentValue + i, adjustedCategory);
  }
  return totalCost;
}
