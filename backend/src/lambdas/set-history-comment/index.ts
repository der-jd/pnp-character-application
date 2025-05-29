import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { HistoryBlock } from "config/index.js";
import {
  getHistoryItems,
  Request,
  parseBody,
  HttpError,
  ensureHttpError,
  validateCharacterId,
  getHistoryItem,
  setRecordComment,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return setHistoryComment({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const bodySchema = z.object({
  comment: z.string(),
});

export type BodySchema = z.infer<typeof bodySchema>;

interface Parameters {
  characterId: string;
  recordId: string;
  blockNumber?: number;
  body: BodySchema;
}

export async function setHistoryComment(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = await validateRequest(request);

    console.log(`Set comment for history record ${params.recordId} of character ${params.characterId}`);
    console.log(`Comment: ${params.body.comment}`);

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

    let foundBlockNumber: number | undefined = undefined;
    let foundRecordIndex: number | undefined = undefined;
    for (const item of items) {
      const index = item.changes.findIndex((change) => change.id === params.recordId);
      if (index !== -1) {
        foundBlockNumber = item.blockNumber;
        foundRecordIndex = index;
        break;
      }
    }
    if (foundBlockNumber === undefined || foundRecordIndex === undefined) {
      throw new HttpError(404, `Record with id ${params.recordId} not found in history block`);
    }

    setRecordComment(params.characterId, foundBlockNumber, foundRecordIndex, params.body.comment);

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        blockNumber: foundBlockNumber,
        recordId: params.recordId,
        comment: params.body.comment,
      }),
    };
    console.log(response);
    return response;
  } catch (error) {
    throw ensureHttpError(error);
  }
}

async function validateRequest(request: Request): Promise<Parameters> {
  console.log("Validate request");

  const characterId = request.pathParameters?.["character-id"];
  const recordId = request.pathParameters?.["record-id"];
  const blockNumber = request.queryStringParameters?.["block-number"];
  if (
    typeof characterId !== "string" ||
    typeof recordId !== "string" ||
    (blockNumber && typeof blockNumber !== "string")
  ) {
    throw new HttpError(400, "Invalid input values!");
  }

  validateCharacterId(characterId);

  try {
    const body = bodySchema.parse(request.body);

    return {
      characterId: characterId,
      recordId: recordId,
      blockNumber: blockNumber ? parseInt(blockNumber) : undefined,
      body: body,
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
