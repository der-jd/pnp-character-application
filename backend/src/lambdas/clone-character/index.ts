import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  getHistoryItems,
  createBatchHistoryItems,
  createCharacterItem,
  isZodError,
  logZodError,
} from "core";
import {
  postCharacterClonePathParamsSchema,
  PostCharacterClonePathParams,
  postCharacterCloneRequestSchema,
  PostCharacterCloneRequest,
  PostCharacterCloneResponse,
  headersSchema,
} from "api-spec";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return cloneCharacter({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  currentUserId: string;
  pathParams: PostCharacterClonePathParams;
  body: PostCharacterCloneRequest;
}

export async function cloneCharacter(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);
    const characterId = params.pathParams["character-id"];
    const userIdOfCharacter = params.body.userIdOfCharacter;

    console.log(`Clone character ${characterId} of user ${userIdOfCharacter}`);

    const character = await getCharacterItem(userIdOfCharacter, characterId);

    character.userId = params.currentUserId;
    character.characterId = uuidv4();
    character.characterSheet.generalInformation.name = `${character.characterSheet.generalInformation.name} (Copy)`;

    const putCalls: Promise<void>[] = [];
    putCalls.push(createCharacterItem(character));

    console.log(`Clone history of character ${characterId} for new character ${character.characterId}`);

    const items = await getHistoryItems(characterId, true);
    if (!items || items.length === 0) {
      console.log(`No history found for character ${characterId}, skipping clone`);
    } else {
      for (const item of items) {
        item.characterId = character.characterId;
      }
      putCalls.push(createBatchHistoryItems(items));
    }

    console.log("Save new character and history items to DynamoDB");
    await Promise.all(putCalls);

    const responseBody: PostCharacterCloneResponse = {
      userId: character.userId,
      characterId: character.characterId,
      name: character.characterSheet.generalInformation.name,
      level: character.characterSheet.generalInformation.level,
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
      currentUserId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams: postCharacterClonePathParamsSchema.parse(request.pathParameters),
      body: postCharacterCloneRequestSchema.parse(request.body),
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
