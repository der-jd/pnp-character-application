import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Request, parseBody, getCharacterItems, ensureHttpError, HttpError, decodeUserId } from "utils/index.js";

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
  characterShort: boolean;
}

export async function getCharacters(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    const items = await getCharacterItems(params.userId);

    let characters = [];
    if (params.characterShort) {
      for (const item of items) {
        characters.push({
          userId: item.userId,
          characterId: item.characterId,
          name: item.characterSheet.generalInformation.name,
          level: item.characterSheet.generalInformation.level,
        });
      }
    } else {
      characters = items;
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characters: characters,
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

  const userId = decodeUserId(request.headers.Authorization);

  if (
    request.queryStringParameters?.["character-short"] &&
    typeof request.queryStringParameters?.["character-short"] !== "string"
  ) {
    throw new HttpError(400, "Invalid input values!");
  }

  const params: Parameters = {
    userId: userId,
    characterShort: request.queryStringParameters?.["character-short"] === "true",
  };

  return params;
}
