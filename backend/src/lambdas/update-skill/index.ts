import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  Skill,
  CalculationPoints,
  CostCategory,
  CombatStats,
  headersSchema,
  PatchSkillPathParams,
  PatchSkillRequest,
  UpdateSkillResponse,
  patchSkillPathParamsSchema,
  patchSkillRequestSchema,
  InitialNew,
  InitialIncreased,
  SkillCategory,
  SkillName,
} from "api-spec";
import {
  Request,
  parseBody,
  getCharacterItem,
  updateSkill,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  updateCombatStats,
  isZodError,
  logZodError,
  parseLearningMethod,
  adjustCostCategory,
  getSkillIncreaseCost,
  getSkill,
  getCombatStats,
  getCombatCategory,
  getSkillActivationCost,
  calculateCombatStats,
  combatStatsChanged,
  isCombatSkill,
} from "core";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateSkill({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: PatchSkillPathParams;
  body: PatchSkillRequest;
}

export async function _updateSkill(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);
    const skillName = params.pathParams["skill-name"] as SkillName;
    const skillCategory = params.pathParams["skill-category"] as SkillCategory;

    console.log(`Update character ${params.pathParams["character-id"]} of user ${params.userId}`);
    console.log(`Update skill '${skillCategory}/${skillName}'`);

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);
    const characterSheet = character.characterSheet;
    const skillOld = getSkill(characterSheet.skills, skillCategory, skillName);
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

    await updateSkill(
      params.userId,
      params.pathParams["character-id"],
      skillCategory,
      skillName,
      skill,
      adventurePoints,
    );

    let combatStatsChange:
      | {
          old: CombatStats;
          new: CombatStats;
        }
      | undefined;
    if (isCombatSkill(skillCategory)) {
      console.log("Calculate combat stats");

      const combatCategory = getCombatCategory(skillName);
      const combatStatsOld = getCombatStats(characterSheet.combat, combatCategory, skillName);
      const combatStats = calculateCombatStats(skillName, skillOld, skill, characterSheet.baseValues, combatStatsOld);

      if (combatStatsChanged(combatStatsOld, combatStats)) {
        console.log("Combat stats changed.");

        combatStatsChange = {
          old: combatStatsOld,
          new: combatStats,
        };

        await updateCombatStats(
          params.userId,
          params.pathParams["character-id"],
          combatCategory,
          skillName,
          combatStats,
        );
      }
    }

    const responseBody: UpdateSkillResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      skillCategory: skillCategory,
      skillName: skillName,
      combatCategory: isCombatSkill(skillCategory) ? getCombatCategory(skillName) : undefined,
      changes: {
        old: {
          skill: skillOld,
          combatStats: combatStatsChange?.old,
        },
        new: {
          skill: skill,
          combatStats: combatStatsChange?.new,
        },
      },
      learningMethod: params.body.learningMethod,
      increaseCost: increaseCost,
      adventurePoints: {
        old: adventurePointsOld,
        new: adventurePoints,
      },
    };
    const response = {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
    console.log(response);
    return response;
  } catch (error) {
    throw logAndEnsureHttpError(error);
  }
}

function validateRequest(request: Request): Parameters {
  try {
    console.log("Validate request");

    const pathParams = patchSkillPathParamsSchema.parse(request.pathParameters);
    const body = patchSkillRequestSchema.parse(request.body);

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
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams: pathParams,
      body: body,
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

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

function updateStartValue(skill: Skill, startValue: InitialNew): Skill {
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
  currentValue: InitialIncreased,
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

function updateModValue(skill: Skill, modValue: InitialNew): Skill {
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
