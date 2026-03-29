import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  Request,
  parseBody,
  getCharacterItems,
  buildErrorResponse,
  HttpError,
  decodeUserId,
  isZodError,
  logZodError,
  createLogger,
  sanitizeEvent,
} from "core";
import {
  getCharactersQueryParamsSchema,
  GetCharactersQueryParams,
  GetCharactersResponse,
  CharacterShort,
  headersSchema,
  Character,
} from "api-spec";

const logger = createLogger("get-characters");

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info(sanitizeEvent(event), "Incoming request");

  return getCharacters({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  queryParams: GetCharactersQueryParams;
}

export async function getCharacters(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    const items = await getCharacterItems(params.userId);

    let characters: (CharacterShort | Character)[] = [];
    if (params.queryParams["character-short"]) {
      for (const item of items) {
        const characterShort: CharacterShort = {
          userId: item.userId,
          characterId: item.characterId,
          name: item.characterSheet.generalInformation.name,
          level: item.characterSheet.generalInformation.level,
          rulesetVersion: item.rulesetVersion,
        };
        characters.push(characterShort);
      }
    } else {
      characters = items;
    }

    const responseBody: GetCharactersResponse = { characters: characters };
    const response = {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
    console.log(response);
    return response;
  } catch (error) {
    return buildErrorResponse(error);
  }
}

function validateRequest(request: Request): Parameters {
  try {
    console.log("Validate request");

    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      queryParams: getCharactersQueryParamsSchema.parse(request.queryStringParameters || {}),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    throw error;
  }
}
