import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  attributeSchema,
  baseValueSchema,
  calculationPointsSchema,
  combatValuesSchema,
  professionHobbySchema,
  RecordType,
  Record,
  historyBlockSchema,
  numberSchema,
  stringSchema,
  booleanSchema,
  skillChangeSchema,
} from "config/index.js";
import {
  getHistoryItems,
  createHistoryItem,
  addHistoryRecord,
  Request,
  parseBody,
  HttpError,
  ensureHttpError,
  validateUUID,
} from "utils/index.js";

const MAX_ITEM_SIZE = 200 * 1024; // 200 KB

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return addRecordToHistory({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const historyBodySchema = z
  .object({
    userId: z.string(),
    type: z.nativeEnum(RecordType),
    name: z.string(),
    data: z
      .object({
        old: z.record(z.any()),
        new: z.record(z.any()),
      })
      .strict(),
    learningMethod: z.string().nullable(),
    calculationPoints: z
      .object({
        adventurePoints: z
          .object({
            old: calculationPointsSchema,
            new: calculationPointsSchema,
          })
          .strict()
          .nullable(),
        attributePoints: z
          .object({
            old: calculationPointsSchema,
            new: calculationPointsSchema,
          })
          .strict()
          .nullable(),
      })
      .strict(),
    comment: z.string().nullable(),
  })
  .strict();

export type HistoryBodySchema = z.infer<typeof historyBodySchema>;

interface Parameters {
  characterId: string;
  body: HistoryBodySchema;
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
      const newBlock = await createHistoryItem(params.characterId);

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
        const newBlock = await createHistoryItem(params.characterId, latestBlock.blockNumber, latestBlock.blockId);
        await addHistoryRecord(record, newBlock);
      } else {
        await addHistoryRecord(record, latestBlock);
      }
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify(record),
    };
    console.log(response);
    return response;
  } catch (error) {
    throw ensureHttpError(error);
  }
}

async function validateRequest(request: Request): Promise<Parameters> {
  console.log("Validate request");

  if (typeof request.pathParameters?.["character-id"] !== "string") {
    throw new HttpError(400, "Invalid input values!");
  }

  const characterId = request.pathParameters?.["character-id"];
  validateUUID(characterId);

  try {
    /**
     * This conversion is necessary if the Lambda is called via AWS Step Functions.
     * The input data of a state machine is a string.
     */
    if (typeof request.body?.type === "string") {
      request.body.type = Number(request.body.type);
    }
    // TODO use parse function and request object for all lambdas
    const body = historyBodySchema.parse(request.body);

    // Check if the character exists
    // Note: This check is currently not necessary as the lambda is called after the update-skill function. I.e. we can assume that the character exists.
    //await getCharacterItem(body.userId, characterId);

    switch (body.type) {
      case RecordType.EVENT_CALCULATION_POINTS:
        calculationPointsSchema.parse(body.data.old);
        calculationPointsSchema.parse(body.data.new);
        break;
      case RecordType.EVENT_LEVEL_UP:
        numberSchema.parse(body.data.old);
        numberSchema.parse(body.data.new);
        break;
      case RecordType.EVENT_BASE_VALUE:
        baseValueSchema.parse(body.data.old);
        baseValueSchema.parse(body.data.new);
        break;
      case RecordType.PROFESSION_CHANGED:
      case RecordType.HOBBY_CHANGED:
        professionHobbySchema.parse(body.data.old);
        professionHobbySchema.parse(body.data.new);
        break;
      case RecordType.ADVANTAGE_CHANGED:
      case RecordType.DISADVANTAGE_CHANGED:
      case RecordType.SPECIAL_ABILITY_CHANGED:
        stringSchema.parse(body.data.old);
        stringSchema.parse(body.data.new);
        break;
      case RecordType.ATTRIBUTE_CHANGED:
        attributeSchema.parse(body.data.old);
        attributeSchema.parse(body.data.new);
        break;
      case RecordType.SKILL_ACTIVATED:
        booleanSchema.parse(body.data.old);
        booleanSchema.parse(body.data.new);
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
      characterId: characterId,
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
