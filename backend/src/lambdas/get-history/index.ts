import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HistoryBlock } from "config/index.js";
import {
  Request,
  parseBody,
  getHistoryItem,
  getHistoryItems,
  ensureHttpError,
  HttpError,
  validateUUID,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getHistory({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  characterId: string;
  blockNumber?: number;
}

export async function getHistory(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Get history of character ${params.characterId}`);

    let items: HistoryBlock[] = [];
    if (params.blockNumber) {
      items.push(await getHistoryItem(params.characterId, params.blockNumber));
    } else {
      items = await getHistoryItems(
        params.characterId,
        false, // Sort descending to get highest block number (latest item) first
        1, // Only get the last item
      );
    }

    if (items.length === 0) {
      console.error("No history found for the given character id");
      throw new HttpError(404, "No history found for the given character id");
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        previousBlockNumber: items[items.length - 1].blockNumber === 1 ? null : items[items.length - 1].blockNumber - 1,
        previousBlockId: items[items.length - 1].previousBlockId,
        items: items,
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

  if (
    typeof request.pathParameters?.["character-id"] !== "string" ||
    (request.queryStringParameters?.["block-number"] &&
      typeof request.queryStringParameters?.["block-number"] !== "string")
  ) {
    throw new HttpError(400, "Invalid input values!");
  }

  const characterId = request.pathParameters?.["character-id"];
  validateUUID(characterId);

  return {
    characterId: characterId,
    blockNumber: request.queryStringParameters?.["block-number"]
      ? parseInt(request.queryStringParameters["block-number"])
      : undefined,
  };
}
