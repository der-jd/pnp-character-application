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
  CombatValues,
  getSkillActivationCost,
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

const initialNewSchema = z.object({
  initialValue: z.number(),
  newValue: z.number(),
});

const initialIncreasedSchema = z.object({
  initialValue: z.number(),
  increasedPoints: z.number(),
});

const bodySchema = z
  .object({
    activated: z.boolean().optional(),
    start: initialNewSchema.strict().optional(),
    current: initialIncreasedSchema.strict().optional(),
    mod: initialNewSchema.strict().optional(),
    learningMethod: z.string().optional(),
  })
  .strict();

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

    let adjustedCostCategory: CostCategory;
    if (params.body.activated || params.body.current) {
      adjustedCostCategory = adjustCostCategory(
        skill.defaultCostCategory,
        parseLearningMethod(params.body.learningMethod!), // Learning method is checked in validateRequest
      );
    }

    if (params.body.activated) {
      const result = activateSkill(skill, params.body.activated, adjustedCostCategory!, adventurePoints);
      skill = result.skill;
      adventurePoints = result.adventurePoints;
    }

    if (params.body.start) {
      skill = updateStartValue(skill, params.body.start);
    }

    let increaseCost: number | undefined;
    if (params.body.current) {
      const result = updateCurrentValue(skill, params.body.current, adjustedCostCategory!, adventurePoints);
      skill = result.skill;
      adventurePoints = result.adventurePoints;
      increaseCost = getSkillIncreaseCost(skill.current, adjustedCostCategory!);
    }

    if (params.body.mod) {
      skill = updateModValue(skill, params.body.mod);
    }

    await updateSkill(params.userId, params.characterId, skillCategory, params.skillName, skill, adventurePoints);

    let combatValues:
      | {
          old: CombatValues;
          new: CombatValues;
        }
      | undefined;
    if (availableCombatPointsChanged(skillOld, skill, params.skillCategory)) {
      console.log("Available combat points changed. Update combat values.");
      const combatCategory = getCombatCategory(characterSheet.combatValues, params.skillName);
      const skillCombatValuesOld = getCombatValues(characterSheet.combatValues, combatCategory, params.skillName);
      const skillCombatValues = structuredClone(skillCombatValuesOld);
      skillCombatValues.availablePoints += skill.current - skillOld.current + (skill.mod - skillOld.mod);
      combatValues = {
        old: skillCombatValuesOld,
        new: skillCombatValues,
      };

      await updateCombatValues(params.userId, params.characterId, combatCategory, params.skillName, skillCombatValues);
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        userId: params.userId,
        skillCategory: params.skillCategory,
        skillName: params.skillName,
        combatCategory:
          params.skillCategory === "combat"
            ? getCombatCategory(characterSheet.combatValues, params.skillName)
            : undefined,
        changes: {
          old: {
            skill: skillOld,
            combatValues: combatValues?.old,
          },
          new: {
            skill: skill,
            combatValues: combatValues?.new,
          },
        },
        learningMethod: params.body.learningMethod,
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
  try {
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

    if ((body.activated || body.current) && !body.learningMethod) {
      throw new HttpError(
        409,
        "Learning method must be given if skill should be activated or the current value should be increased!",
      );
    }

    if (body.current && body.current.increasedPoints <= 0) {
      throw new HttpError(
        400,
        "Points to increase skill value are negative or null! The value must be greater than or equal 1.",
        {
          increasedPoints: body.current.increasedPoints,
        },
      );
    }

    if (body.activated !== undefined && body.activated === false) {
      throw new HttpError(409, "Deactivating a skill is not allowed!");
    }

    return {
      userId: userId,
      characterId: characterId,
      skillCategory: skillCategory,
      skillName: skillName,
      body: body,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
      throw new HttpError(400, "Invalid input values!");
    }

    // Rethrow other errors
    throw error;
  }
}

function activateSkill(
  skill: Skill,
  activated: boolean,
  adjustedCostCategory: CostCategory,
  adventurePoints: CalculationPoints,
): { skill: Skill; adventurePoints: CalculationPoints } {
  if (skill.activated && activated) {
    console.log("Skill already activated. Nothing to do.");
    return { skill, adventurePoints };
  } else {
    console.log(`Skill total cost before activation: ${skill.totalCost}`);
    console.log(`Available adventure points before activation: ${adventurePoints.available}`);

    const activationCost = getSkillActivationCost(adjustedCostCategory);

    console.log(`Activating skill for ${activationCost} AP...`);

    if (activationCost > adventurePoints.available) {
      throw new HttpError(400, "Not enough adventure points to activate the skill!");
    }

    skill.activated = true;
    skill.totalCost += activationCost;
    adventurePoints.available -= activationCost;
    console.log(`Skill total cost: ${skill.totalCost}`);
    console.log(`Available adventure points: ${adventurePoints.available}`);

    return { skill, adventurePoints };
  }
}

function updateStartValue(skill: Skill, startValue: z.infer<typeof initialNewSchema>): Skill {
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
  currentValue: z.infer<typeof initialIncreasedSchema>,
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

function updateModValue(skill: Skill, modValue: z.infer<typeof initialNewSchema>): Skill {
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

export function availableCombatPointsChanged(skillOld: Skill, skillNew: Skill, skillCategory: string): boolean {
  const isCombatSkill = skillCategory === "combat";
  if (!isCombatSkill) return false;

  // No relevant change in combat skill points
  if (skillOld.current === skillNew.current && skillOld.mod === skillNew.mod) return false;

  return true;
}
