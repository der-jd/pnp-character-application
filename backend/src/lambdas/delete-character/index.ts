import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  Request,
  parseBody,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateUUID,
  getHistoryItems,
  deleteCharacterItem,
  deleteBatchHistoryItems,
} from "utils";
import { historyBlockSchema } from "config";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return deleteCharacter({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  characterId: string;
}

export async function deleteCharacter(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Delete character ${params.characterId} of user ${params.userId} and its history`);

    // Wait for the character item to be deleted or throw an error if it does not exist.
    await deleteCharacterItem(params.userId, params.characterId);

    const deleteCalls: Promise<void>[] = [];
    const items = await getHistoryItems(params.characterId, true);
    if (!items || items.length === 0) {
      console.log(`No history found for character ${params.characterId}, skipping delete`);
    } else {
      deleteCalls.push(deleteBatchHistoryItems(items.map((item) => historyBlockSchema.parse(item))));
    }
    await Promise.all(deleteCalls);

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        userId: params.userId,
        characterId: params.characterId,
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

  const currentUserId = decodeUserId(request.headers.authorization ?? request.headers.Authorization);

  const characterId = request.pathParameters?.["character-id"];
  if (typeof characterId !== "string") {
    throw new HttpError(400, "Invalid input values!");
  }

  validateUUID(characterId);

  return {
    userId: currentUserId,
    characterId: characterId,
  };
}
