import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, parseBody, getCharacterItems, ensureHttpError, HttpError } from "utils/index.js";

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
  } catch (err) {
    throw ensureHttpError(err);
  }
}

function validateRequest(request: Request): Parameters {
  console.log("Validate request");

  // TODO move handling of authorization token to Lambda layer
  // Trim the authorization header as it could contain spaces at the beginning
  const authHeader = request.headers.Authorization?.trim() || request.headers.authorization?.trim();
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized: No token provided!");
  }

  const token = authHeader.split(" ")[1]; // Remove "Bearer " prefix
  // Decode the token without verification (the access to the API itself is already protected by the authorizer)
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded) {
    throw new HttpError(401, "Unauthorized: Invalid token!");
  }

  const userId = decoded.sub; // Cognito User ID
  if (!userId) {
    throw new HttpError(401, "Unauthorized: User ID not found in token!");
  }

  if (
    request.queryStringParameters?.["character-short"] &&
    typeof request.queryStringParameters?.["character-short"] !== "string"
  ) {
    console.error("Invalid input values!");
    throw new HttpError(400, "Invalid input values!");
  }

  const params: Parameters = {
    userId: userId,
    characterShort: request.queryStringParameters?.["character-short"] === "true",
  };

  return params;
}
