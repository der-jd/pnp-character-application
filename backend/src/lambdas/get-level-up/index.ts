import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { headersSchema, getLevelUpPathParamsSchema, GetLevelUpPathParams, GetLevelUpResponse } from "api-spec";
import {
  Request,
  parseBody,
  decodeUserId,
  getCharacterItem,
  isZodError,
  logZodError,
  logAndEnsureHttpError,
  HttpError,
  computeLevelUpOptions,
  computeLevelUpOptionsHash,
} from "core";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _getLevelUp({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: GetLevelUpPathParams;
}

export async function _getLevelUp(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);

    const nextLevel = character.characterSheet.generalInformation.level + 1;

    const responseBody: GetLevelUpResponse = {
      characterId: character.characterId,
      userId: character.userId,
      nextLevel: nextLevel,
      options: computeLevelUpOptions(nextLevel, character.characterSheet.generalInformation.levelUpProgress),
      optionsHash: computeLevelUpOptionsHash(character),
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
      pathParams: getLevelUpPathParamsSchema.parse(request.pathParameters),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }
    throw error;
  }
}
