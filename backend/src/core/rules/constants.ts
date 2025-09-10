import { CostCategory, combatSkillsSchema } from "api-spec";

export const ATTRIBUTE_POINTS_FOR_CREATION = 40;

export const MIN_ATTRIBUTE_VALUE_FOR_CREATION = 4;
export const MAX_ATTRIBUTE_VALUE_FOR_CREATION = 7;

export const PROFESSION_SKILL_BONUS = 50;
export const HOBBY_SKILL_BONUS = 25;

export const NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION = 5;

export const COST_CATEGORY_DEFAULT = CostCategory.CAT_2;
export const COST_CATEGORY_COMBAT_SKILLS = CostCategory.CAT_3;

export const combatSkills = Object.keys(combatSkillsSchema.shape) as Array<keyof typeof combatSkillsSchema.shape>;

export const MAX_COST_CATEGORY = CostCategory.CAT_4;
export const MIN_COST_CATEGORY = CostCategory.CAT_0;

export const SKILL_THRESHOLDS = [50, 75, 99999];

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
 * |     0      |      x      |
 * |     1      |      x      |
 * |     2      |      x      |
 * |     3      |      x      |
 * |     4      |      x      |
 * +------------+-------------+
 */
export const SKILL_ACTIVATION_COSTS: number[] = [0, 40, 50, 60, 70];

export const START_SKILLS: string[] = [
  // body skills
  "athletics",
  "climbing",
  "bodyControl",
  "sneaking",
  "swimming",
  "selfControl",
  "hiding",
  "singing",
  "sharpnessOfSenses",
  "quaffing",
  // social skills
  "etiquette",
  "knowledgeOfHumanNature",
  "persuading",
  // nature skills
  "knottingSkills",
  // knowledge skills
  "mathematics",
  "zoology",
  // handcraft skills
  "woodwork",
  "foodProcessing",
  "fabricProcessing",
  "steeringVehicles",
  "bargaining",
  "firstAid",
  "calmingSbDown",
  "drawingAndPainting",
  ...combatSkills,
];
