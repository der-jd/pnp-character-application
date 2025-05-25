import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import {
  attributeSchema,
  baseValueSchema,
  calculationPointsSchema,
  combatSkillSchema,
  professionHobbySchema,
  RecordType,
  Record,
  skillSchema,
  historyBlockSchema,
  recordSchema,
  numberSchema,
  stringSchema,
  booleanSchema,
} from "config/index.js";
import {
  getHistoryItems,
  deleteHistoryItem,
  deleteLatestHistoryRecord,
  Request,
  parseBody,
  HttpError,
  ensureHttpError,
  validateCharacterId,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return revertRecordFromHistory({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  characterId: string;
  recordId: string;
}

export async function revertRecordFromHistory(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = await validateRequest(request);

    console.log(`Delete record ${params.recordId} from history of character ${params.characterId}`);

    const items = await getHistoryItems(
      params.characterId,
      false, // Sort descending to get highest block number (latest item) first
      1, // Only need the top result
    );

    if (!items || items.length === 0) {
      throw new HttpError(404, "No history found for the given character id");
    } else if (items.length !== 1) {
      throw new HttpError(500, "More than one latest history block found for the given character id");
    }

    const latestBlock = historyBlockSchema.parse(items[0]);
    console.log("Latest history block:", { ...latestBlock, changes: ["..."] }); // Don't log changes as this can be a very long list
    const latestRecord = latestBlock.changes[latestBlock.changes.length - 1];

    if (latestRecord.id !== params.recordId) {
      throw new HttpError(404, "The latest record does not match the given id");
    }

    revertChange(latestRecord);

    if (latestBlock.changes.length === 1) {
      console.log("Deleting the complete history block as it only contains the record that should be deleted");
      await deleteHistoryItem(latestBlock);
    } else {
      await deleteLatestHistoryRecord(latestBlock);
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify(latestRecord),
    };
    console.log(response);
    return response;
  } catch (error) {
    throw ensureHttpError(error);
  }
}

async function validateRequest(request: Request): Promise<Parameters> {
  console.log("Validate request");

  if (
    typeof request.pathParameters?.["character-id"] !== "string" ||
    typeof request.pathParameters?.["record-id"] !== "string"
  ) {
    throw new HttpError(400, "Invalid input values!");
  }

  const characterId = request.pathParameters?.["character-id"];
  validateCharacterId(characterId);

  return {
    characterId: characterId,
    recordId: request.pathParameters["record-id"],
  };
}

function revertChange(record: Record): void {
  console.log("Reverting change:", record);

  try {
    recordSchema.parse(record);

    // TODO implement revert logic for each record type
    // We must call an update function for the dynamodb item to revert the change.
    switch (record.type) {
      case RecordType.EVENT_CALCULATION_POINTS:
        calculationPointsSchema.parse(record.data.old);
        break;
      case RecordType.EVENT_LEVEL_UP:
        numberSchema.parse(record.data.old);
        break;
      case RecordType.EVENT_BASE_VALUE:
        baseValueSchema.parse(record.data.old);
        break;
      case RecordType.PROFESSION_CHANGED:
        professionHobbySchema.parse(record.data.old);
        break;
      case RecordType.HOBBY_CHANGED:
        professionHobbySchema.parse(record.data.old);
        break;
      case RecordType.ADVANTAGE_CHANGED:
        stringSchema.parse(record.data.old);
        break;
      case RecordType.DISADVANTAGE_CHANGED:
        stringSchema.parse(record.data.old);
        break;
      case RecordType.SPECIAL_ABILITY_CHANGED:
        stringSchema.parse(record.data.old);
        break;
      case RecordType.ATTRIBUTE_RAISED:
        attributeSchema.parse(record.data.old);
        break;
      case RecordType.SKILL_ACTIVATED:
        booleanSchema.parse(record.data.old);
        break;
      case RecordType.SKILL_RAISED:
        skillSchema.parse(record.data.old);
        break;
      case RecordType.ATTACK_PARADE_DISTRIBUTED:
        combatSkillSchema.parse(record.data.old);
        break;
      default:
        throw new HttpError(500, "Unknown history record type!");
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
      throw new HttpError(500, "Invalid history record values!");
    }

    // Rethrow other errors
    throw error;
  }
}
