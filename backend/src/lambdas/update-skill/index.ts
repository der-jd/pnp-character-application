import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import {
  parseLearningMethod,
  adjustCostCategory,
  Character,
  getSkillIncreaseCost,
  getSkill,
  Skill,
  CalculationPoints,
  CostCategory,
  getCombatValues,
  getCombatCategory,
} from "config/index.js";
import {
  Request,
  parseBody,
  getCharacterItem,
  updateSkill,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateUUID,
  updateCombatValues,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateSkill({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const bodySchema = z.object({
  start: z
    .object({
      initialValue: z.number(),
      newValue: z.number(),
    })
    .optional(),
  current: z
    .object({
      initialValue: z.number(),
      increasedPoints: z.number(),
      learningMethod: z.string(),
    })
    .optional(),
  mod: z
    .object({
      initialValue: z.number(),
      newValue: z.number(),
    })
    .optional(),
});

interface Parameters {
  userId: string;
  characterId: string;
  skillCategory: string;
  skillName: string;
  body: z.infer<typeof bodySchema>;
}

export async function _updateSkill(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.characterId} of user ${params.userId}`);
    console.log(`Update skill '${params.skillCategory}/${params.skillName}'`);

    const character = await getCharacterItem(params.userId, params.characterId);
    const characterSheet = character.characterSheet;
    const skillCategory = params.skillCategory as keyof Character["characterSheet"]["skills"];
    const skillOld = getSkill(characterSheet.skills, skillCategory, params.skillName);
    let skill = structuredClone(skillOld);
    const adventurePointsOld = characterSheet.calculationPoints.adventurePoints;
    let adventurePoints = structuredClone(adventurePointsOld);

    if (params.body.start) {
      skill = updateStartValue(skill, params.body.start);
    }

    let increaseCost: number | undefined;
    if (params.body.current) {
      const adjustedCostCategory = adjustCostCategory(
        skill.defaultCostCategory,
        parseLearningMethod(params.body.current.learningMethod),
      );
      const result = updateCurrentValue(skill, params.body.current, adjustedCostCategory, adventurePoints);
      skill = result.skill;
      adventurePoints = result.adventurePoints;
      increaseCost = getSkillIncreaseCost(skill.current, adjustedCostCategory);
    }

    if (params.body.mod) {
      skill = updateModValue(skill, params.body.mod);
    }

    await updateSkill(params.userId, params.characterId, skillCategory, params.skillName, skill, adventurePoints);

    if (availableCombatPointsChanged(skillOld, skill, params.skillCategory)) {
      console.log("Available combat points changed. Update combat values.");
      const combatCategory = getCombatCategory(characterSheet.combatValues, params.skillName);
      const skillCombatValues = getCombatValues(characterSheet.combatValues, combatCategory, params.skillName);
      skillCombatValues.availablePoints += skill.current - skillOld.current + (skill.mod - skillOld.mod);
      await updateCombatValues(params.userId, params.characterId, combatCategory, params.skillName, skillCombatValues);
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        userId: params.userId,
        skillCategory: params.skillCategory,
        skillName: params.skillName,
        skill: {
          old: skillOld,
          new: skill,
        },
        learningMethod: params.body.current?.learningMethod,
        increaseCost: increaseCost,
        adventurePoints: {
          old: adventurePointsOld,
          new: adventurePoints,
        },
      }),
    };
    console.log(response);
    return response;
  } catch (error) {
    throw ensureHttpError(error);
  }
}

function validateRequest(request: Request): Parameters {
  console.log("Validate request");

  const userId = decodeUserId(request.headers.authorization ?? request.headers.Authorization);

  const characterId = request.pathParameters?.["character-id"];
  const skillCategory = request.pathParameters?.["skill-category"];
  const skillName = request.pathParameters?.["skill-name"];
  if (typeof characterId !== "string" || typeof skillCategory !== "string" || typeof skillName !== "string") {
    throw new HttpError(400, "Invalid input values!");
  }

  validateUUID(characterId);

  const body = bodySchema.parse(request.body);

  if (body.current && body.current.increasedPoints <= 0) {
    throw new HttpError(
      400,
      "Points to increase skill value are negative or null! The value must be greater than or equal 1.",
      {
        increasedPoints: body.current?.increasedPoints,
      },
    );
  }

  return {
    userId: userId,
    characterId: characterId,
    skillCategory: skillCategory,
    skillName: skillName,
    body: body,
  };
}

function updateStartValue(skill: Skill, startValue: any): Skill {
  console.log(`Update start value of the skill from ${startValue.initialValue} to ${startValue.newValue}`);

  if (!skill.activated) {
    throw new HttpError(409, "Skill is not activated yet! Activate it before it can be updated.");
  }

  if (startValue.initialValue !== skill.start && startValue.newValue !== skill.start) {
    throw new HttpError(409, "The passed skill value doesn't match the value in the backend!", {
      passedStartValue: startValue.initialValue,
      backendStartValue: skill.start,
    });
  }

  if (startValue.newValue === skill.start) {
    console.log("Skill start value already updated to target value. Nothing to do.");
    return skill;
  } else {
    skill.start = startValue.newValue;
    return skill;
  }
}

function updateCurrentValue(
  skill: Skill,
  currentValue: any,
  adjustedCostCategory: CostCategory,
  adventurePoints: CalculationPoints,
): { skill: Skill; adventurePoints: CalculationPoints } {
  console.log(
    `Update current value of the skill from ${currentValue.initialValue} to ${currentValue.initialValue + currentValue.increasedPoints}`,
  );

  if (!skill.activated) {
    throw new HttpError(409, "Skill is not activated yet! Activate it before it can be updated.");
  }

  if (
    currentValue.initialValue !== skill.current &&
    currentValue.initialValue + currentValue.increasedPoints !== skill.current
  ) {
    throw new HttpError(409, "The passed skill value doesn't match the value in the backend!", {
      passedCurrentValue: currentValue.initialValue,
      backendCurrentValue: skill.current,
    });
  }

  if (currentValue.initialValue + currentValue.increasedPoints === skill.current) {
    console.log("Skill current value already updated to target value. Nothing to do.");
    return { skill, adventurePoints };
  } else {
    console.log(`Default cost category: ${skill.defaultCostCategory}`);
    console.log(`Adjusted cost category: ${adjustedCostCategory}`);
    console.log(`Skill total cost before increasing: ${skill.totalCost}`);
    console.log(`Available adventure points before increasing: ${adventurePoints.available}`);

    for (let i = 0; i < currentValue.increasedPoints; i++) {
      console.debug("---------------------------");
      const increaseCost = getSkillIncreaseCost(skill.current, adjustedCostCategory);

      if (increaseCost > adventurePoints.available) {
        throw new HttpError(400, "Not enough adventure points to increase the skill!");
      }

      console.debug(`Skill value: ${skill.current}`);
      console.debug(`Skill total cost: ${skill.totalCost}`);
      console.debug(`Available adventure points: ${adventurePoints.available}`);
      console.debug(`Increasing skill by 1 for ${increaseCost} AP...`);
      skill.current += 1;
      skill.totalCost += increaseCost;
      adventurePoints.available -= increaseCost;
    }

    return { skill, adventurePoints };
  }
}

function updateModValue(skill: Skill, modValue: any): Skill {
  console.log(`Update mod value of the skill from ${modValue.initialValue} to ${modValue.newValue}`);

  if (!skill.activated) {
    throw new HttpError(409, "Skill is not activated yet! Activate it before it can be updated.");
  }

  if (modValue.initialValue !== skill.mod && modValue.newValue !== skill.mod) {
    throw new HttpError(409, "The passed skill value doesn't match the value in the backend!", {
      passedModValue: modValue.initialValue,
      backendModValue: skill.mod,
    });
  }

  if (modValue.newValue === skill.mod) {
    console.log("Skill mod value already updated to target value. Nothing to do.");
    return skill;
  } else {
    skill.mod = modValue.newValue;
    return skill;
  }
}

export function availableCombatPointsChanged(skillOld: Skill, skill: Skill, skillCategory: string): boolean {
  const isCombatSkill = skillCategory === "combat";
  if (!isCombatSkill) return false;

  // No relevant change in combat skill points
  if (skillOld.current === skill.current && skillOld.mod === skill.mod) return false;

  return true;
}
