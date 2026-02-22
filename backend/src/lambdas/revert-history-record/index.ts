import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  combatStatsSchema,
  RecordType,
  Record,
  historyBlockSchema,
  recordSchema,
  CalculationPoints,
  skillChangeSchema,
  attributeChangeSchema,
  CharacterSheet,
  calculationPointsChangeSchema,
  specialAbilitiesChangeSchema,
  deleteHistoryRecordPathParamsSchema,
  DeleteHistoryRecordPathParams,
  DeleteHistoryRecordResponse,
  headersSchema,
  CombatSection,
  baseValueChangeSchema,
  levelUpChangeSchema,
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
  updateCombatStats,
  updateBaseValue,
  setSpecialAbilities,
  logZodError,
  isZodError,
  getSkillCategoryAndName,
  getCombatCategory,
  setLevelUp,
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
      `Delete record ${params.pathParams["record-id"]} from history of character ${params.pathParams["character-id"]}`
    );

    const items = await getHistoryItems(
      params.pathParams["character-id"],
      false, // Sort descending to get highest block number (latest item) first
      1 // Only need the top result
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
      case RecordType.LEVEL_UP_APPLIED: {
        const oldData = levelUpChangeSchema.parse(record.data.old);

        await setLevelUp(userId, characterId, oldData.level, oldData.levelUpProgress);

        if (oldData.baseValues) {
          const updates: Promise<void>[] = [];
          for (const baseValueName of Object.keys(oldData.baseValues) as (keyof CharacterSheet["baseValues"])[]) {
            const oldBaseValue = oldData.baseValues[baseValueName];

            // This check shouldn't be necessary as we loop over only existing base values. However, TypeScript complains without it.
            if (oldBaseValue === undefined) {
              throw new HttpError(500, `Base value '${String(baseValueName)}' is missing in old data`);
            }

            updates.push(updateBaseValue(userId, characterId, baseValueName, oldBaseValue));
          }
          await Promise.all(updates);
        }

        if (oldData.specialAbilities) {
          await setSpecialAbilities(userId, characterId, oldData.specialAbilities);
        }

        await updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        await updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      case RecordType.BASE_VALUE_CHANGED: {
        const oldData = baseValueChangeSchema.parse(record.data.old);
        await updateBaseValue(userId, characterId, record.name, oldData.baseValue);

        if (oldData.combat) {
          const updates: Promise<void>[] = [];
          for (const combatCategory of Object.keys(oldData.combat) as (keyof CombatSection)[]) {
            // This check shouldn't be necessary as we loop over only existing categories. However, TypeScript complains without it.
            if (oldData.combat[combatCategory] === undefined) {
              throw new HttpError(500, `Combat category '${String(combatCategory)}' is missing in old data`);
            }

            for (const [skillName, oldCombatStats] of Object.entries(oldData.combat[combatCategory])) {
              updates.push(updateCombatStats(userId, characterId, combatCategory, skillName, oldCombatStats));
            }
          }
          await Promise.all(updates);
        }

        await updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        await updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      case RecordType.SPECIAL_ABILITIES_CHANGED: {
        const oldSpecialAbilities = specialAbilitiesChangeSchema.parse(record.data.old).values;
        await setSpecialAbilities(userId, characterId, oldSpecialAbilities);
        await updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        await updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      case RecordType.ATTRIBUTE_CHANGED: {
        const oldData = attributeChangeSchema.parse(record.data.old);

        if (oldData.baseValues) {
          const updates: Promise<void>[] = [];
          for (const baseValueName of Object.keys(oldData.baseValues) as (keyof CharacterSheet["baseValues"])[]) {
            const oldBaseValue = oldData.baseValues[baseValueName];

            // This check shouldn't be necessary as we loop over only existing base values. However, TypeScript complains without it.
            if (oldBaseValue === undefined) {
              throw new HttpError(500, `Base value '${String(baseValueName)}' is missing in old data`);
            }

            updates.push(updateBaseValue(userId, characterId, baseValueName, oldBaseValue));
          }
          await Promise.all(updates);
        }

        if (oldData.combat) {
          const updates: Promise<void>[] = [];
          for (const combatCategory of Object.keys(oldData.combat) as (keyof CombatSection)[]) {
            // This check shouldn't be necessary as we loop over only existing categories. However, TypeScript complains without it.
            if (oldData.combat[combatCategory] === undefined) {
              throw new HttpError(500, `Combat category '${String(combatCategory)}' is missing in old data`);
            }

            for (const [skillName, oldCombatStats] of Object.entries(oldData.combat[combatCategory])) {
              updates.push(updateCombatStats(userId, characterId, combatCategory, skillName, oldCombatStats));
            }
          }
          await Promise.all(updates);
        }

        await updateAttribute(
          userId,
          characterId,
          record.name,
          oldData.attribute,
          requireProperty(record.calculationPoints.attributePoints?.old, "attributePoints")
        );
        await updateAdventurePointsIfExists(userId, characterId, record.calculationPoints.adventurePoints?.old);
        break;
      }
      case RecordType.SKILL_CHANGED: {
        const oldData = skillChangeSchema.parse(record.data.old);

        const { category: skillCategory, name: skillName } = getSkillCategoryAndName(record.name);

        if (oldData.combatStats) {
          const combatCategory = getCombatCategory(skillName);
          await updateCombatStats(userId, characterId, combatCategory, skillName, oldData.combatStats);
        }

        await updateSkill(
          userId,
          characterId,
          skillCategory,
          skillName,
          oldData.skill,
          requireProperty(record.calculationPoints.adventurePoints?.old, "adventurePoints")
        );
        await updateAttributePointsIfExists(userId, characterId, record.calculationPoints.attributePoints?.old);
        break;
      }
      case RecordType.COMBAT_STATS_CHANGED: {
        const oldCombatStats = combatStatsSchema.parse(record.data.old);
        const [combatCategory, combatSkillName] = record.name.split("/");
        await updateCombatStats(userId, characterId, combatCategory, combatSkillName, oldCombatStats);
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
  points: CalculationPoints | undefined
): Promise<void> {
  if (points) {
    await updateAttributePoints(userId, characterId, points);
  }
}

async function updateAdventurePointsIfExists(
  userId: string,
  characterId: string,
  points: CalculationPoints | undefined
): Promise<void> {
  if (points) {
    await updateAdventurePoints(userId, characterId, points);
  }
}
