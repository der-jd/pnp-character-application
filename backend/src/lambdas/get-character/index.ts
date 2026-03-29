import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  Request,
  parseBody,
  getCharacterItem,
  HttpError,
  buildErrorResponse,
  decodeUserId,
  isZodError,
  logZodError,
  createLogger,
  sanitizeEvent,
} from "core";
import { getCharacterPathParamsSchema, GetCharacterResponse, GetCharacterPathParams, headersSchema } from "api-spec";

const logger = createLogger("get-character");

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info(sanitizeEvent(event), "Incoming request");

  return getCharacter({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: GetCharacterPathParams;
}

export async function getCharacter(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);

    const responseBody: GetCharacterResponse = character;
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
      pathParams: getCharacterPathParamsSchema.parse(request.pathParameters),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    throw error;
  }
}
