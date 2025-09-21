import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  Request,
  parseBody,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  getHistoryItems,
  deleteCharacterItem,
  deleteBatchHistoryItems,
  isZodError,
  logZodError,
} from "core";
import {
  deleteCharacterPathParamsSchema,
  DeleteCharacterPathParams,
  DeleteCharacterResponse,
  historyBlockSchema,
  headersSchema,
} from "api-spec";

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
  pathParams: DeleteCharacterPathParams;
}

export async function deleteCharacter(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);
    const characterId = params.pathParams["character-id"];

    console.log(`Delete character ${characterId} of user ${params.userId} and its history`);

    // Wait for the character item to be deleted or throw an error if it does not exist.
    await deleteCharacterItem(params.userId, characterId);

    const deleteCalls: Promise<void>[] = [];
    const items = await getHistoryItems(characterId, true);
    if (!items || items.length === 0) {
      console.log(`No history found for character ${characterId}, skipping delete`);
    } else {
      deleteCalls.push(deleteBatchHistoryItems(items.map((item) => historyBlockSchema.parse(item))));
    }
    await Promise.all(deleteCalls);

    const responseBody: DeleteCharacterResponse = {
      userId: params.userId,
      characterId: characterId,
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
      pathParams: deleteCharacterPathParamsSchema.parse(request.pathParameters),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    throw error;
  }
}
