export enum LearningMethod {
  FREE = 99, // Cost Category 0
  LOW_PRICED = -1, // Cost Category -1
  NORMAL = 0, // Default Cost Category
  EXPENSIVE = 1, // Cost Category +1
}

export function parseLearningMethod(method: string): LearningMethod {
  return LearningMethod[method.toUpperCase() as keyof typeof LearningMethod];
}

/**
 * The number values of CostCategory are used for the character sheet, not the string values "CAT_X".
 * Using the string values leads to multiple cumbersome problems and workarounds when trying to use
 * schemas with zod.
 */
export enum CostCategory {
  CAT_0 = 0,
  CAT_1 = 1,
  CAT_2 = 2,
  CAT_3 = 3,
  CAT_4 = 4,
}

const MAX_COST_CATEGORY = CostCategory.CAT_4;
const MIN_COST_CATEGORY = CostCategory.CAT_0;

export function parseCostCategory(category: string): CostCategory {
  return CostCategory[category.toUpperCase() as keyof typeof CostCategory];
}

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

const skillThresholds = [50, 75, 99999];

/**
 * +------------+-------------+-------------+-------------+
 * |  Category  | Threshold 1 | Threshold 2 | Threshold 3 |
 * +------------+-------------+-------------+-------------+
 * |     0      |      x      |      x      |      x      |
 * |     1      |      x      |      x      |      x      |
 * |     2      |      x      |      x      |      x      |
 * |     3      |      x      |      x      |      x      |
 * |     4      |      x      |      x      |      x      |
 * +------------+-------------+-------------+-------------+
 */
const costMatrix: number[][] = [
  [0, 0, 0],
  [0.5, 1, 2],
  [1, 2, 3],
  [2, 3, 4],
  [3, 4, 5],
];

export function getSkillIncreaseCost(skillValue: number, costCategory: CostCategory): number {
  const columnIndex = skillThresholds.findIndex((threshold) => skillValue < threshold);
  return costMatrix[costCategory][columnIndex];
}
