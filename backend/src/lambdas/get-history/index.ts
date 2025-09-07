import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  HistoryBlock,
  headersSchema,
  GetHistoryPathParams,
  GetHistoryQueryParams,
  GetHistoryResponse,
  getHistoryPathParamsSchema,
  getHistoryQueryParamsSchema,
} from "shared";
import {
  Request,
  parseBody,
  getHistoryItem,
  getHistoryItems,
  getCharacterItem,
  logAndEnsureHttpError,
  HttpError,
  decodeUserId,
  isZodError,
  logZodError,
} from "utils";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getHistory({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: GetHistoryPathParams;
  queryParams?: GetHistoryQueryParams;
}

export async function getHistory(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    // First verify that the user owns the character and is therefore allowed to access the history
    await getCharacterItem(params.userId, params.pathParams["character-id"]);

    console.log(`Get history of character ${params.pathParams["character-id"]} for user ${params.userId}`);

    let items: HistoryBlock[] = [];
    if (params.queryParams?.["block-number"]) {
      items.push(await getHistoryItem(params.pathParams["character-id"], params.queryParams["block-number"]));
    } else {
      items = await getHistoryItems(
        params.pathParams["character-id"],
        false, // Sort descending to get highest block number (latest item) first
        1, // Only get the last item
      );
    }

    if (items.length === 0) {
      throw new HttpError(404, "No history found for the given character id");
    }

    const responseBody: GetHistoryResponse = {
      previousBlockNumber: items[items.length - 1].blockNumber === 1 ? null : items[items.length - 1].blockNumber - 1,
      previousBlockId: items[items.length - 1].previousBlockId,
      items: items,
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
      pathParams: getHistoryPathParamsSchema.parse(request.pathParameters),
      queryParams: request.queryStringParameters
        ? getHistoryQueryParamsSchema.parse(request.queryStringParameters)
        : undefined,
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
