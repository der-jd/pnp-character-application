import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  parseLearningMethod,
  adjustCostCategory,
  Character,
  getSkillIncreaseCost,
  getSkill,
  Skill,
} from "config/index.js";
import {
  Request,
  parseBody,
  getCharacterItem,
  updateSkill,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateCharacterId,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return increaseSkill({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  characterId: string;
  skillCategory: string;
  skillName: string;
  initialSkillValue: number;
  increasedPoints: number;
  learningMethod: string;
}

export async function increaseSkill(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.characterId} of user ${params.userId}`);
    console.log(
      `Increase value of skill '${params.skillCategory}/${params.skillName}' from ${params.initialSkillValue} to ${params.initialSkillValue + params.increasedPoints} by learning method '${params.learningMethod}'`,
    );

    const character = await getCharacterItem(params.userId, params.characterId);

    const characterSheet = character.characterSheet;
    const adventurePointsOld = characterSheet.calculationPoints.adventurePoints;
    const adventurePoints = structuredClone(adventurePointsOld);
    const skillCategory = params.skillCategory as keyof Character["characterSheet"]["skills"];
    const skillOld = getSkill(characterSheet.skills, skillCategory, params.skillName);
    const skill = structuredClone(skillOld);
    const adjustedCostCategory = adjustCostCategory(
      skill.defaultCostCategory,
      parseLearningMethod(params.learningMethod),
    );

    validatePassedSkillValues(skill, params);

    console.log(`Default cost category: ${skill.defaultCostCategory}`);
    console.log(`Adjusted cost category: ${adjustedCostCategory}`);
    console.log(`Skill total cost before increasing: ${skill.totalCost}`);
    console.log(`Available adventure points before increasing: ${adventurePoints.available}`);

    if (params.initialSkillValue + params.increasedPoints === skill.current) {
      console.log("Skill value already increased to target value. Nothing to do.");
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          characterId: params.characterId,
          userId: params.userId,
          skillName: params.skillName,
          skill: {
            old: skillOld,
            new: skill,
          },
          learningMethod: params.learningMethod,
          increaseCost: getSkillIncreaseCost(skill.current, adjustedCostCategory),
          adventurePoints: {
            old: adventurePointsOld,
            new: adventurePoints,
          },
        }),
      };
      console.log(response);

      return response;
    }

    for (let i = 0; i < params.increasedPoints; i++) {
      console.debug("---------------------------");
      const increaseCost = getSkillIncreaseCost(skill.current, adjustedCostCategory);

      if (increaseCost > adventurePoints.available) {
        throw new HttpError(400, "Not enough adventure points to increase the skill!", {
          characterId: params.characterId,
          skillName: params.skillName,
        });
      }

      console.debug(`Skill value: ${skill.current}`);
      console.debug(`Skill total cost: ${skill.totalCost}`);
      console.debug(`Available adventure points: ${adventurePoints.available}`);
      console.debug(`Increasing skill by 1 for ${increaseCost} AP...`);
      skill.current += 1;
      skill.totalCost += increaseCost;
      adventurePoints.available -= increaseCost;
    }

    await updateSkill(
      params.userId,
      params.characterId,
      skillCategory,
      params.skillName,
      skill.current,
      skill.totalCost,
      adventurePoints.available,
    );

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        userId: params.userId,
        skillName: params.skillName,
        skill: {
          old: skillOld,
          new: skill,
        },
        learningMethod: params.learningMethod,
        increaseCost: getSkillIncreaseCost(skill.current, adjustedCostCategory),
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

  /**
   * This conversion is necessary if the Lambda is called via AWS Step Functions.
   * The input data of a state machine is a string.
   */
  if (typeof request.body?.initialValue === "string") {
    request.body.initialValue = Number(request.body.initialValue);
  }
  if (typeof request.body?.increasedPoints === "string") {
    request.body.increasedPoints = Number(request.body.increasedPoints);
  }

  if (
    typeof request.pathParameters?.["character-id"] !== "string" ||
    typeof request.pathParameters?.["skill-category"] !== "string" ||
    typeof request.pathParameters?.["skill-name"] !== "string" ||
    typeof request.body?.initialValue !== "number" ||
    typeof request.body?.increasedPoints !== "number" ||
    typeof request.body?.learningMethod !== "string"
  ) {
    throw new HttpError(400, "Invalid input values!");
  }

  const params: Parameters = {
    userId: userId,
    characterId: request.pathParameters["character-id"],
    skillCategory: request.pathParameters["skill-category"],
    skillName: request.pathParameters["skill-name"],
    initialSkillValue: request.body.initialValue,
    increasedPoints: request.body.increasedPoints,
    learningMethod: request.body.learningMethod,
  };

  if (params.increasedPoints <= 0) {
    throw new HttpError(400, "Points to increase are negative! The value must be greater than or equal 1.", {
      increasedPoints: params.increasedPoints,
    });
  }

  validateCharacterId(params.characterId);

  return params;
}

function validatePassedSkillValues(skill: Skill, params: Parameters) {
  console.log("Compare passed skill values with the values in the backend");

  if (!skill.activated) {
    throw new HttpError(409, "Skill is not activated yet! Activate it before it can be increased.", {
      characterId: params.characterId,
      skillName: params.skillName,
    });
  }

  if (
    params.initialSkillValue !== skill.current &&
    params.initialSkillValue + params.increasedPoints !== skill.current
  ) {
    throw new HttpError(409, "The passed skill value doesn't match the value in the backend!", {
      characterId: params.characterId,
      skillName: params.skillName,
      passedSkillValue: params.initialSkillValue,
      backendSkillValue: skill.current,
    });
  }

  console.log("Passed skill values match the values in the backend");
}
