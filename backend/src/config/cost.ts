// TODO Not used atm. this needs to be placed in the frontend as dropdown menu to calc the actual cost category to send to the backend
export enum LearningMethod {
  FREE, // Cost Category 0
  LOW_PRICED, // Cost Category -1
  NORMAL, // Default Cost Category
  EXPENSIVE, // Cost Category +1
}

export enum CostCategory {
  CAT_0,
  CAT_1,
  CAT_2,
  CAT_3,
  CAT_4,
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CostCategory {
  export function parse(category: string): CostCategory {
    /**
     * The function itself is added as a key to the enum, because it is part of a namespace with the same name.
     * Therefore, Exclude<> is used to remove the function name from the keys of the enum.
     */
    return CostCategory[category.toUpperCase() as Exclude<keyof typeof CostCategory, "parse">];
  }
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
