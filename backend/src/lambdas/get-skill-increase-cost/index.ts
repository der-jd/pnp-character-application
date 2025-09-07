import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { adjustCostCategory, getSkillIncreaseCost, getSkill, parseLearningMethod } from "config";
import {
  GetSkillIncreaseCostPathParams,
  GetSkillIncreaseCostQueryParams,
  GetSkillIncreaseCostResponse,
  getSkillIncreaseCostPathParamsSchema,
  getSkillIncreaseCostQueryParamsSchema,
  headersSchema,
  Character,
} from "shared";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  logZodError,
  isZodError,
} from "utils";

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
  pathParams: GetSkillIncreaseCostPathParams;
  queryParams: GetSkillIncreaseCostQueryParams;
}

export async function getSkillCost(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(
      `Get increase cost for skill '${params.pathParams["skill-category"]}/${params.pathParams["skill-name"]}' (learning method '${params.queryParams["learning-method"]}') of character ${params.pathParams["character-id"]} of user ${params.userId}`,
    );

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);

    const characterSheet = character.characterSheet;
    const skillCategory = params.pathParams["skill-category"] as keyof Character["characterSheet"]["skills"];
    const defaultCostCategory = getSkill(
      characterSheet.skills,
      skillCategory,
      params.pathParams["skill-name"],
    ).defaultCostCategory;
    const adjustedCostCategory = adjustCostCategory(
      defaultCostCategory,
      parseLearningMethod(params.queryParams["learning-method"]),
    );
    const skillValue = getSkill(characterSheet.skills, skillCategory, params.pathParams["skill-name"]).current;

    console.log(`Default cost category: ${defaultCostCategory}`);
    console.log(`Adjusted cost category: ${adjustedCostCategory}`);

    const increaseCost = getSkillIncreaseCost(skillValue, adjustedCostCategory);

    const responseBody: GetSkillIncreaseCostResponse = {
      characterId: params.pathParams["character-id"],
      skillName: params.pathParams["skill-name"],
      increaseCost: increaseCost,
    };
    const response = {
      statusCode: 200,
      body: JSON.stringify(responseBody),
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
    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams: getSkillIncreaseCostPathParamsSchema.parse(request.pathParameters),
      queryParams: getSkillIncreaseCostQueryParamsSchema.parse(request.queryStringParameters),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    // Rethrow other errors
    throw error;
  }
}
