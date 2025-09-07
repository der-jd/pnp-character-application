import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  updateLevel,
  logZodError,
  isZodError,
} from "utils";
import { headersSchema, updateLevelRequestSchema, updateLevelPathParamsSchema, UpdateLevelResponse } from "shared";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateLevel({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  characterId: string;
  initialLevel: number;
}

export async function _updateLevel(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update level of character ${params.characterId} of user ${params.userId}`);

    const character = await getCharacterItem(params.userId, params.characterId);
    const levelOld = character.characterSheet.generalInformation.level;
    const levelNew = increaseLevel(levelOld, params.initialLevel);
    await updateLevel(params.userId, params.characterId, levelNew);

    const responseBody: UpdateLevelResponse = {
      characterId: params.characterId,
      userId: params.userId,
      level: {
        old: {
          value: levelOld,
        },
        new: {
          value: levelNew,
        },
      },
    };
    const response = {
      statusCode: 200,
      body: JSON.stringify(responseBody),
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
    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      characterId: updateLevelPathParamsSchema.parse(request.pathParameters)["character-id"],
      initialLevel: updateLevelRequestSchema.parse(request.body).initialLevel,
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

function increaseLevel(level: number, passedInitialLevel: number): number {
  const levelNew = level + 1;
  console.log(`Update level from ${level} to ${levelNew}`);

  if (passedInitialLevel !== level && passedInitialLevel + 1 !== level) {
    throw new HttpError(409, "The passed initial level doesn't match the value in the backend!", {
      passedLevel: passedInitialLevel,
      backendLevel: level,
    });
  }

  if (passedInitialLevel + 1 === level) {
    console.log("Level already increased. Nothing to do."); // Make call idempotent
    return level;
  } else {
    return levelNew;
  }
}
