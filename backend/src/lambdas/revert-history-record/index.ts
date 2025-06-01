import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import {
  attributeSchema,
  baseValueSchema,
  calculationPointsSchema,
  combatValuesSchema,
  professionHobbySchema,
  RecordType,
  Record,
  skillSchema,
  historyBlockSchema,
  recordSchema,
  numberSchema,
  stringSchema,
  booleanSchema,
  CalculationPoints,
} from "config/index.js";
import {
  getHistoryItems,
  deleteHistoryItem,
  deleteLatestHistoryRecord,
  Request,
  parseBody,
  HttpError,
  ensureHttpError,
  validateUUID,
  updateAdventurePoints,
  decodeUserId,
  updateAttributePoints,
  updateAttribute,
  updateSkill,
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
  userId: string;
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

    revertChange(params.userId, params.characterId, latestRecord);

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

  const characterId = request.pathParameters?.["character-id"];
  const recordId = request.pathParameters?.["record-id"];
  if (typeof characterId !== "string" || typeof recordId !== "string") {
    throw new HttpError(400, "Invalid input values!");
  }

  validateUUID(characterId);
  validateUUID(recordId);

  return {
    userId: decodeUserId(request.headers.authorization ?? request.headers.Authorization),
    characterId: characterId,
    recordId: recordId,
  };
}

function revertChange(userId: string, characterId: string, record: Record): void {
  console.log("Reverting change:", record);

  try {
    recordSchema.parse(record);

    switch (record.type) {
      case RecordType.EVENT_CALCULATION_POINTS:
        calculationPointsSchema.parse(record.data.old);
        throw new HttpError(500, "Reverting calculation points change is not implemented yet!"); // TODO
        break;
      case RecordType.EVENT_LEVEL_UP:
        numberSchema.parse(record.data.old);
        throw new HttpError(500, "Reverting level up is not implemented yet!"); // TODO
        break;
      case RecordType.EVENT_BASE_VALUE:
        baseValueSchema.parse(record.data.old);
        throw new HttpError(500, "Reverting base value change is not implemented yet!"); // TODO
        break;
      case RecordType.PROFESSION_CHANGED:
        professionHobbySchema.parse(record.data.old);
        throw new HttpError(500, "Reverting profession change is not implemented yet!"); // TODO
        break;
      case RecordType.HOBBY_CHANGED:
        professionHobbySchema.parse(record.data.old);
        throw new HttpError(500, "Reverting hobby change is not implemented yet!"); // TODO
        break;
      case RecordType.ADVANTAGE_CHANGED:
        stringSchema.parse(record.data.old);
        throw new HttpError(500, "Reverting advantage change is not implemented yet!"); // TODO
        break;
      case RecordType.DISADVANTAGE_CHANGED:
        stringSchema.parse(record.data.old);
        throw new HttpError(500, "Reverting disadvantage change is not implemented yet!"); // TODO
        break;
      case RecordType.SPECIAL_ABILITY_CHANGED:
        stringSchema.parse(record.data.old);
        throw new HttpError(500, "Reverting special ability change is not implemented yet!"); // TODO
        break;
      case RecordType.ATTRIBUTE_CHANGED: {
        const oldAttribute = attributeSchema.parse(record.data.old);
        updateAttribute(
          userId,
          characterId,
          record.name,
          oldAttribute,
          requireProperty(record.calculationPoints.attributePoints?.old, "attributePoints"),
        );
        updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      case RecordType.SKILL_ACTIVATED:
        booleanSchema.parse(record.data.old);
        throw new HttpError(500, "Reverting skill activation is not implemented yet!"); // TODO
        break;
      case RecordType.SKILL_RAISED: {
        const oldSkill = skillSchema.parse(record.data.old);
        const [skillCategory, skillName] = record.name.split("/");
        updateSkill(
          userId,
          characterId,
          skillCategory,
          skillName,
          oldSkill,
          requireProperty(record.calculationPoints.adventurePoints?.old, "adventurePoints"),
        );
        updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        break;
      }
      case RecordType.COMBAT_VALUES_CHANGED:
        combatValuesSchema.parse(record.data.old);
        throw new HttpError(500, "Reverting combat value change is not implemented yet!"); // TODO
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

function requireProperty<T>(property: T | undefined | null, name: string): T {
  if (!property) {
    throw new HttpError(500, `Property ${name} is required but missing or null!`);
  }
  return property;
}

function updateAttributePointsIfExists(
  userId: string,
  characterId: string,
  points: CalculationPoints | undefined,
): void {
  if (points) {
    updateAttributePoints(userId, characterId, points);
  }
}

function updateAdventurePointsIfExists(
  userId: string,
  characterId: string,
  points: CalculationPoints | undefined,
): void {
  if (points) {
    updateAdventurePoints(userId, characterId, points);
  }
}
