import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  baseValueSchema,
  combatValuesSchema,
  RecordType,
  Record,
  historyBlockSchema,
  integerSchema,
  skillChangeSchema,
  attributeChangeSchema,
  HistoryBlock,
  calculationPointsChangeSchema,
  stringArraySchema,
  recordSchema,
  userIdSchema,
} from "api-spec";
import {
  getHistoryItems,
  createHistoryItem,
  addHistoryRecord,
  Request,
  parseBody,
  HttpError,
  logAndEnsureHttpError,
  isZodError,
  logZodError,
} from "core";

const MAX_ITEM_SIZE = 200 * 1024; // 200 KB

export const addHistoryRecordPathParamsSchema = z
  .object({
    "character-id": z.uuid(),
  })
  .strict();

export type AddHistoryRecordPathParams = z.infer<typeof addHistoryRecordPathParamsSchema>;

export const addHistoryRecordRequestSchema = recordSchema
  .omit({
    number: true,
    id: true,
    timestamp: true,
  })
  .extend({
    userId: userIdSchema,
  })
  .strict();

export type AddHistoryRecordRequest = z.infer<typeof addHistoryRecordRequestSchema>;

export const addHistoryRecordResponseSchema = recordSchema;

export type AddHistoryRecordResponse = z.infer<typeof addHistoryRecordResponseSchema>;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return addRecordToHistory({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  characterId: string;
  body: AddHistoryRecordRequest;
}

export async function addRecordToHistory(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = await validateRequest(request);
    const { userId, ...bodyWithoutUserId } = params.body;

    console.log(`Add record to history of character ${params.characterId} of user ${userId}`);

    const items = await getHistoryItems(
      params.characterId,
      false, // Sort descending to get highest block number (latest item) first
      1, // Only need the top result
    );

    let record: Record;
    if (!items || items.length === 0) {
      console.log("No history found for the given character id");

      const newBlock: HistoryBlock = {
        characterId: params.characterId,
        blockId: uuidv4(),
        blockNumber: 1,
        previousBlockId: null,
        changes: [],
      };
      await createHistoryItem(newBlock);

      record = {
        number: 1,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...bodyWithoutUserId,
      };
      await addHistoryRecord(record, newBlock);
    } else if (items.length !== 1) {
      throw new HttpError(500, "More than one latest history block found for the given character id");
    } else {
      const latestBlock = historyBlockSchema.parse(items[0]);
      console.log("Latest history block:", { ...latestBlock, changes: ["..."] }); // Don't log changes as this can be a very long list

      const latestRecord = latestBlock.changes[latestBlock.changes.length - 1];
      record = {
        number: latestRecord.number + 1,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...bodyWithoutUserId,
      };

      if (isDuplicate(latestRecord, record)) {
        console.log("The new record is the same as the latest record in the history. No action is needed.");
        const response = {
          statusCode: 200,
          body: JSON.stringify(latestRecord),
        };
        console.log(response);
        return response;
      }

      const blockSize = estimateItemSize(latestBlock);
      const recordSize = estimateItemSize(record);
      if (blockSize + recordSize > MAX_ITEM_SIZE) {
        console.log(
          `Latest block with the new record (total size ~${blockSize + recordSize} bytes) would exceed the maximum allowed size of ${MAX_ITEM_SIZE} bytes/block`,
        );

        const newBlock: HistoryBlock = {
          characterId: params.characterId,
          blockId: uuidv4(),
          blockNumber: latestBlock.blockNumber + 1,
          previousBlockId: latestBlock.blockId,
          changes: [],
        };
        await createHistoryItem(newBlock);

        await addHistoryRecord(record, newBlock);
      } else {
        await addHistoryRecord(record, latestBlock);
      }
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify(record as AddHistoryRecordResponse),
    };
    console.log(response);
    return response;
  } catch (error) {
    throw logAndEnsureHttpError(error);
  }
}

async function validateRequest(request: Request): Promise<Parameters> {
  console.log("Validate request");

  try {
    /**
     * This conversion is necessary if the Lambda is called via AWS Step Functions.
     * The input data of a state machine is a string.
     */
    if (typeof request.body?.type === "string") {
      request.body.type = Number(request.body.type);
    }
    const body = addHistoryRecordRequestSchema.parse(request.body);

    // Check if the character exists
    // Note: This check is currently not necessary as the lambda is called after the update-skill function. I.e. we can assume that the character exists.
    //await getCharacterItem(body.userId, characterId);

    switch (body.type) {
      case RecordType.CALCULATION_POINTS_CHANGED:
        calculationPointsChangeSchema.parse(body.data.old);
        calculationPointsChangeSchema.parse(body.data.new);
        break;
      case RecordType.LEVEL_CHANGED:
        integerSchema.parse(body.data.old);
        integerSchema.parse(body.data.new);
        break;
      case RecordType.BASE_VALUE_CHANGED:
        baseValueSchema.parse(body.data.old);
        baseValueSchema.parse(body.data.new);
        break;
      case RecordType.SPECIAL_ABILITIES_CHANGED:
        stringArraySchema.parse(body.data.old);
        stringArraySchema.parse(body.data.new);
        break;
      case RecordType.ATTRIBUTE_CHANGED:
        attributeChangeSchema.parse(body.data.old);
        attributeChangeSchema.parse(body.data.new);
        break;
      case RecordType.SKILL_CHANGED:
        skillChangeSchema.parse(body.data.old);
        skillChangeSchema.parse(body.data.new);
        break;
      case RecordType.COMBAT_VALUES_CHANGED:
        combatValuesSchema.parse(body.data.old);
        combatValuesSchema.parse(body.data.new);
        break;
      default:
        throw new HttpError(400, "Invalid history record type!");
    }

    return {
      characterId: addHistoryRecordPathParamsSchema.parse(request.pathParameters)["character-id"],
      body: body,
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

function estimateItemSize(item: any): number {
  const marshalled = marshall(item);
  const json = JSON.stringify(marshalled);
  return Buffer.byteLength(json, "utf8");
}

function isDuplicate(record_1: Record, record_2: Record): boolean {
  const isDuplicate =
    record_1.type === record_2.type &&
    record_1.name === record_2.name &&
    JSON.stringify(record_1.data) === JSON.stringify(record_2.data) &&
    record_1.learningMethod === record_2.learningMethod &&
    JSON.stringify(record_1.calculationPoints) === JSON.stringify(record_2.calculationPoints);

  return isDuplicate;
}
