import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateUUID,
  getHistoryItems,
  createBatchHistoryItems,
  createCharacterItem,
} from "utils";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return cloneCharacter({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const bodySchema = z
  .object({
    userIdOfCharacter: z.string().uuid(),
  })
  .strict();

interface Parameters {
  currentUserId: string;
  characterId: string;
  userIdOfCharacter: string;
}

export async function cloneCharacter(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Clone character ${params.characterId} of user ${params.userIdOfCharacter}`);

    const character = await getCharacterItem(params.userIdOfCharacter, params.characterId);

    character.userId = params.currentUserId;
    character.characterId = uuidv4();
    character.characterSheet.generalInformation.name = `${character.characterSheet.generalInformation.name} (Copy)`;

    const putCalls: Promise<void>[] = [];
    putCalls.push(createCharacterItem(character));

    console.log(`Clone history of character ${params.characterId} for new character ${character.characterId}`);

    const items = await getHistoryItems(params.characterId, true);
    if (!items || items.length === 0) {
      console.log(`No history found for character ${params.characterId}, skipping clone`);
    } else {
      for (const item of items) {
        item.characterId = character.characterId;
      }
      putCalls.push(createBatchHistoryItems(items));
    }

    console.log("Save new character and history items to DynamoDB");
    await Promise.all(putCalls);

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        userId: character.userId,
        characterId: character.characterId,
        name: character.characterSheet.generalInformation.name,
        level: character.characterSheet.generalInformation.level,
      }),
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

    const currentUserId = decodeUserId(request.headers.authorization ?? request.headers.Authorization);

    const characterId = request.pathParameters?.["character-id"];
    if (typeof characterId !== "string") {
      throw new HttpError(400, "Invalid input values!");
    }

    validateUUID(characterId);

    const body = bodySchema.parse(request.body);

    return {
      currentUserId: currentUserId,
      characterId: characterId,
      userIdOfCharacter: body.userIdOfCharacter,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
      throw new HttpError(400, "Invalid input values!");
    }

    // Rethrow other errors
    throw error;
  }
}
