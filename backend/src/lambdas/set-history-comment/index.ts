import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  HistoryBlock,
  patchHistoryRecordPathParamsSchema,
  PatchHistoryRecordPathParams,
  patchHistoryRecordQueryParamsSchema,
  PatchHistoryRecordQueryParams,
  patchHistoryRecordRequestSchema,
  PatchHistoryRecordRequest,
  PatchHistoryRecordResponse,
  headersSchema,
} from "api-spec";
import {
  getHistoryItems,
  Request,
  parseBody,
  HttpError,
  logAndEnsureHttpError,
  getHistoryItem,
  setRecordComment,
  decodeUserId,
  logZodError,
  isZodError,
  getCharacterItem,
} from "core";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return setHistoryComment({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: PatchHistoryRecordPathParams;
  queryParams?: PatchHistoryRecordQueryParams;
  body: PatchHistoryRecordRequest;
}

export async function setHistoryComment(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = await validateRequest(request);

    // First verify that the user owns the character and is therefore allowed to access the history
    await getCharacterItem(params.userId, params.pathParams["character-id"]);

    console.log(
      `Set comment for history record ${params.pathParams["record-id"]} of character ${params.pathParams["character-id"]}`,
    );
    console.log(`Comment: ${params.body.comment}`);

    let items: HistoryBlock[] = [];
    if (params.queryParams?.["block-number"]) {
      items.push(await getHistoryItem(params.pathParams["character-id"], params.queryParams?.["block-number"]));
    } else {
      items = await getHistoryItems(
        params.pathParams["character-id"],
        false, // Sort descending to get highest block number (latest item) first
        1, // Only get the last item
      );
    }

    let foundBlockNumber: number | undefined = undefined;
    let foundRecordIndex: number | undefined = undefined;
    for (const item of items) {
      console.debug(`Checking history block #${item.blockNumber} with ${item.changes.length} changes`);
      const index = item.changes.findIndex((change) => change.id === params.pathParams["record-id"]);
      if (index !== -1) {
        console.log(`Found record at index ${index} in block #${item.blockNumber}`);
        console.log(`Current comment: ${item.changes[index].comment}`);
        foundBlockNumber = item.blockNumber;
        foundRecordIndex = index;
        break;
      }
    }
    if (foundBlockNumber === undefined || foundRecordIndex === undefined) {
      throw new HttpError(404, `Record with id ${params.pathParams["record-id"]} not found in history block`);
    }

    await setRecordComment(params.pathParams["character-id"], foundBlockNumber, foundRecordIndex, params.body.comment);

    const responseBody: PatchHistoryRecordResponse = {
      characterId: params.pathParams["character-id"],
      blockNumber: foundBlockNumber,
      recordId: params.pathParams["record-id"],
      comment: params.body.comment,
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

async function validateRequest(request: Request): Promise<Parameters> {
  try {
    console.log("Validate request");
    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams: patchHistoryRecordPathParamsSchema.parse(request.pathParameters),
      queryParams: patchHistoryRecordQueryParamsSchema.parse(request.queryStringParameters) || undefined,
      body: patchHistoryRecordRequestSchema.parse(request.body),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    throw error;
  }
}
