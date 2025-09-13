import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  baseValueSchema,
  combatValuesSchema,
  RecordType,
  Record,
  historyBlockSchema,
  recordSchema,
  integerSchema,
  CalculationPoints,
  skillChangeSchema,
  attributeChangeSchema,
  CharacterSheet,
  calculationPointsChangeSchema,
  stringArraySchema,
  deleteHistoryRecordPathParamsSchema,
  DeleteHistoryRecordPathParams,
  DeleteHistoryRecordResponse,
  headersSchema,
} from "api-spec";
import {
  getHistoryItems,
  deleteHistoryItem,
  deleteLatestHistoryRecord,
  Request,
  parseBody,
  HttpError,
  logAndEnsureHttpError,
  updateAdventurePoints,
  decodeUserId,
  updateAttributePoints,
  updateAttribute,
  updateSkill,
  updateCombatValues,
  updateBaseValue,
  updateLevel,
  setSpecialAbilities,
  logZodError,
  isZodError,
} from "core";

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
  pathParams: DeleteHistoryRecordPathParams;
}

export async function revertRecordFromHistory(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = await validateRequest(request);

    console.log(
      `Delete record ${params.pathParams["record-id"]} from history of character ${params.pathParams["character-id"]}`,
    );

    const items = await getHistoryItems(
      params.pathParams["character-id"],
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

    if (latestRecord.id !== params.pathParams["record-id"]) {
      throw new HttpError(404, "The latest record does not match the given id");
    }

    await revertChange(params.userId, params.pathParams["character-id"], latestRecord);

    if (latestBlock.changes.length === 1) {
      console.log("Deleting the complete history block as it only contains the record that should be deleted");
      await deleteHistoryItem(latestBlock);
    } else {
      await deleteLatestHistoryRecord(latestBlock);
    }

    const responseBody: DeleteHistoryRecordResponse = latestRecord;
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
      pathParams: deleteHistoryRecordPathParamsSchema.parse(request.pathParameters),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }
    throw error;
  }
}

async function revertChange(userId: string, characterId: string, record: Record): Promise<void> {
  console.log("Reverting change:", record);

  try {
    recordSchema.parse(record);

    switch (record.type) {
      case RecordType.CHARACTER_CREATED:
        throw new HttpError(400, "Reverting character creation is not allowed! Delete the character instead.");
      case RecordType.CALCULATION_POINTS_CHANGED: {
        const oldData = calculationPointsChangeSchema.parse(record.data.old);
        await updateAdventurePointsIfExists(userId, characterId, oldData.adventurePoints);
        await updateAttributePointsIfExists(userId, characterId, oldData.attributePoints);
        break;
      }
      case RecordType.LEVEL_CHANGED: {
        const oldData = integerSchema.parse(record.data.old);
        await updateLevel(userId, characterId, oldData.value);
        await updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        await updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      case RecordType.BASE_VALUE_CHANGED: {
        const oldBaseValue = baseValueSchema.parse(record.data.old);
        await updateBaseValue(userId, characterId, record.name, oldBaseValue);
        await updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        await updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      case RecordType.SPECIAL_ABILITIES_CHANGED: {
        const oldSpecialAbilities = stringArraySchema.parse(record.data.old).values;
        await setSpecialAbilities(userId, characterId, oldSpecialAbilities);
        await updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        await updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      case RecordType.ATTRIBUTE_CHANGED: {
        const oldData = attributeChangeSchema.parse(record.data.old);
        const newData = attributeChangeSchema.parse(record.data.new);

        if (oldData.baseValues && newData.baseValues) {
          const updates: Promise<void>[] = [];
          for (const baseValueName of Object.keys(oldData.baseValues) as (keyof CharacterSheet["baseValues"])[]) {
            const oldBaseValue = oldData.baseValues[baseValueName];
            const newBaseValue = newData.baseValues[baseValueName];

            // This check shouldn't be necessary as we loop over only existing base values. However, TypeScript complains without it.
            if (oldBaseValue === undefined || newBaseValue === undefined) {
              throw new HttpError(500, `Base value '${String(baseValueName)}' is missing in old / new data`);
            }

            /**
             * This check is obsolete because the record only contains the base values that have changed.
             * However, it is kept here for safety and efficiency in case the record is modified in the future.
             */
            if (oldBaseValue.byFormula && oldBaseValue.byFormula !== newBaseValue.byFormula) {
              updates.push(updateBaseValue(userId, characterId, baseValueName, oldBaseValue));
            }
          }
          await Promise.all(updates);
        }

        await updateAttribute(
          userId,
          characterId,
          record.name,
          oldData.attribute,
          requireProperty(record.calculationPoints.attributePoints?.old, "attributePoints"),
        );
        await updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      case RecordType.SKILL_CHANGED: {
        const oldData = skillChangeSchema.parse(record.data.old);

        const skillCategory = record.name.split("/")[0];
        let skillName: string;
        if (skillCategory === "combat") {
          // name pattern is "skillCategory/skillName (combatCategory)"
          skillName = record.name.split(" (")[0].split("/")[1];
        } else {
          // name pattern is "skillCategory/skillName"
          skillName = record.name.split("/")[1];
        }

        if (oldData.combatValues) {
          // name pattern is "skillCategory/skillName (combatCategory)"
          const combatCategory = record.name.split(" (")[1].slice(0, -1); // Remove the trailing ")"
          await updateCombatValues(userId, characterId, combatCategory, skillName, oldData.combatValues);
        }

        await updateSkill(
          userId,
          characterId,
          skillCategory,
          skillName,
          oldData.skill,
          requireProperty(record.calculationPoints.adventurePoints?.old, "adventurePoints"),
        );
        await updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        break;
      }
      case RecordType.COMBAT_VALUES_CHANGED: {
        const oldSkillCombatValues = combatValuesSchema.parse(record.data.old);
        const [combatCategory, combatSkillName] = record.name.split("/");
        await updateCombatValues(userId, characterId, combatCategory, combatSkillName, oldSkillCombatValues);
        await updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        await updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      default:
        throw new HttpError(500, "Unknown history record type!");
    }
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
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

async function updateAttributePointsIfExists(
  userId: string,
  characterId: string,
  points: CalculationPoints | undefined,
): Promise<void> {
  if (points) {
    await updateAttributePoints(userId, characterId, points);
  }
}

async function updateAdventurePointsIfExists(
  userId: string,
  characterId: string,
  points: CalculationPoints | undefined,
): Promise<void> {
  if (points) {
    await updateAdventurePoints(userId, characterId, points);
  }
}
