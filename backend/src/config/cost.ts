export enum CostCategory {
  FREE,
  LOW_PRICED,
  NORMAL,
  EXPENSIVE,
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

// TODO Add Lambda function that returns basic config/rule values for frontend
const skillThresholds = [50, 75, 99999];

/**
 * +------------+-------------+-------------+-------------+
 * |            | Threshold 1 | Threshold 2 | Threshold 3 |
 * +------------+-------------+-------------+-------------+
 * | FREE       |      x      |      x      |      x      |
 * | LOW_PRICED |      x      |      x      |      x      |
 * | NORMAL     |      x      |      x      |      x      |
 * | EXPENSIVE  |      x      |      x      |      x      |
 * +------------+-------------+-------------+-------------+
 */
const costMatrix: number[][] = [
  [0, 0, 0],
  [0.5, 1, 2],
  [1, 2, 3],
  [2, 3, 4],
];

export function getIncreaseCost(skillValue: number, costCategory: CostCategory): number {
  const columnIndex = skillThresholds.findIndex((threshold) => skillValue < threshold);
  return costMatrix[costCategory][columnIndex];
}
