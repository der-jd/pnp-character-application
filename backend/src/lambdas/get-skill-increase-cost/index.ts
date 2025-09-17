import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  GetSkillPathParams,
  GetSkillQueryParams,
  GetSkillResponse,
  getSkillPathParamsSchema,
  getSkillQueryParamsSchema,
  headersSchema,
  SkillName,
  SkillCategory,
} from "api-spec";
import {
  adjustCostCategory,
  getSkillIncreaseCost,
  getSkill,
  parseLearningMethod,
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  logZodError,
  isZodError,
} from "core";

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
  pathParams: GetSkillPathParams;
  queryParams: GetSkillQueryParams;
}

export async function getSkillCost(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);
    const skillName = params.pathParams["skill-name"] as SkillName;
    const skillCategory = params.pathParams["skill-category"] as SkillCategory;

    console.log(
      `Get increase cost for skill '${skillCategory}/${skillName}' (learning method '${params.queryParams["learning-method"]}') of character ${params.pathParams["character-id"]} of user ${params.userId}`,
    );

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);

    const characterSheet = character.characterSheet;
    const defaultCostCategory = getSkill(characterSheet.skills, skillCategory, skillName).defaultCostCategory;
    const adjustedCostCategory = adjustCostCategory(
      defaultCostCategory,
      parseLearningMethod(params.queryParams["learning-method"]),
    );
    const skillValue = getSkill(characterSheet.skills, skillCategory, skillName).current;

    console.log(`Default cost category: ${defaultCostCategory}`);
    console.log(`Adjusted cost category: ${adjustedCostCategory}`);

    const increaseCost = getSkillIncreaseCost(skillValue, adjustedCostCategory);

    // TODO update get-skill-increase-cost endpoint to include skill activation costs. Rename endpoint?
    const responseBody: GetSkillResponse = {
      characterId: params.pathParams["character-id"],
      skillName: skillName,
      increaseCost: increaseCost,
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
    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams: getSkillPathParamsSchema.parse(request.pathParameters),
      queryParams: getSkillQueryParamsSchema.parse(request.queryStringParameters),
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
