import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { adjustCostCategory, Character, getSkillIncreaseCost, getSkill, parseLearningMethod } from "config/index.js";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateCharacterId,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getSkillCost({
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
  learningMethod: string;
}

export async function getSkillCost(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(
      `Get increase cost for skill '${params.skillCategory}/${params.skillName}' (learning method '${params.learningMethod}') of character ${params.characterId} of user ${params.userId}`,
    );

    const character = await getCharacterItem(params.userId, params.characterId);

    const characterSheet = character.characterSheet;
    const skillCategory = params.skillCategory as keyof Character["characterSheet"]["skills"];
    const defaultCostCategory = getSkill(characterSheet.skills, skillCategory, params.skillName).defaultCostCategory;
    const adjustedCostCategory = adjustCostCategory(defaultCostCategory, parseLearningMethod(params.learningMethod));
    const skillValue = getSkill(characterSheet.skills, skillCategory, params.skillName).current;

    console.log(`Default cost category: ${defaultCostCategory}`);
    console.log(`Adjusted cost category: ${adjustedCostCategory}`);

    const increaseCost = getSkillIncreaseCost(skillValue, adjustedCostCategory);

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        skillName: params.skillName,
        increaseCost: increaseCost,
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

  if (
    typeof request.pathParameters?.["character-id"] !== "string" ||
    typeof request.pathParameters?.["skill-category"] !== "string" ||
    typeof request.pathParameters?.["skill-name"] !== "string" ||
    typeof request.queryStringParameters?.["learning-method"] !== "string"
  ) {
    throw new HttpError(400, "Invalid input values!");
  }

  const params: Parameters = {
    userId: userId,
    characterId: request.pathParameters["character-id"],
    skillCategory: request.pathParameters["skill-category"],
    skillName: request.pathParameters["skill-name"],
    learningMethod: request.queryStringParameters["learning-method"],
  };

  validateCharacterId(params.characterId);

  return params;
}
