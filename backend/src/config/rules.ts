import { combatSkills } from "./character.js";
import { CostCategory } from "./cost.js";

export const ATTRIBUTE_POINTS_FOR_CREATION = 40;

export const MIN_ATTRIBUTE_VALUE_FOR_CREATION = 4;
export const MAX_ATTRIBUTE_VALUE_FOR_CREATION = 7;

export const PROFESSION_SKILL_BONUS = 50;
export const HOBBY_SKILL_BONUS = 25;

export const NUMBER_OF_ACTIVATABLE_SKILLS_FOR_CREATION = 5;

export const START_LEVEL = 1;

export const COST_CATEGORY_DEFAULT = CostCategory.CAT_2;
export const COST_CATEGORY_COMBAT_SKILLS = CostCategory.CAT_3;

export const startSkills: string[] = [
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
