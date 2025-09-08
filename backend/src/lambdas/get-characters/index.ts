import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  Request,
  parseBody,
  getCharacterItems,
  logAndEnsureHttpError,
  HttpError,
  decodeUserId,
  isZodError,
  logZodError,
} from "utils";
import {
  getCharactersQueryParamsSchema,
  GetCharactersQueryParams,
  GetCharactersResponse,
  CharacterShort,
  headersSchema,
} from "api-spec";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

    let characters = [];
    if (params.queryParams["character-short"]) {
      for (const item of items) {
        const characterShort: CharacterShort = {
          userId: item.userId,
          characterId: item.characterId,
          name: item.characterSheet.generalInformation.name,
          level: item.characterSheet.generalInformation.level,
        };
        characters.push(characterShort);
      }
    } else {
      characters = items;
    }

    const responseBody: GetCharactersResponse = {
      characters: characters,
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
      queryParams: getCharactersQueryParamsSchema.parse(request.queryStringParameters || {}),
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
