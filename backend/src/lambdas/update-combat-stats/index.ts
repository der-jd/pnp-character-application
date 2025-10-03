import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  headersSchema,
  PatchCombatStatsPathParams,
  PatchCombatStatsRequest,
  UpdateCombatStatsResponse,
  patchCombatStatsPathParamsSchema,
  patchCombatStatsRequestSchema,
  CombatStats,
  SkillName,
  CombatSection,
} from "api-spec";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  updateCombatStats,
  isZodError,
  logZodError,
  getCombatStats,
  calculateCombatStats,
  combatStatsChanged,
} from "core";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateCombatStats({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: PatchCombatStatsPathParams;
  body: PatchCombatStatsRequest;
}

export async function _updateCombatStats(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);
    const combatCategory = params.pathParams["combat-category"] as keyof CombatSection;
    const combatSkillName = params.pathParams["combat-skill-name"] as SkillName;

    console.log(`Update character ${params.pathParams["character-id"]} of user ${params.userId}`);
    console.log(
      `Update skilled attack/parade value of combat skill '${combatCategory}/${combatSkillName}' from ` +
        `${params.body.skilledAttackValue.initialValue}/${params.body.skilledParadeValue.initialValue} to ` +
        `${params.body.skilledAttackValue.initialValue + params.body.skilledAttackValue.increasedPoints}/${params.body.skilledParadeValue.initialValue + params.body.skilledParadeValue.increasedPoints}`,
    );

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);

    const characterSheet = character.characterSheet;
    const combatStatsOld = getCombatStats(characterSheet.combat, combatCategory, combatSkillName);
    let combatStats = combatStatsOld;

    validatePassedValues(combatStatsOld, params);

    if (idempotentUpdate(combatStatsOld, params)) {
      console.log("Combat stats already updated to target value. Nothing to do.");
    } else {
      combatStats = calculateCombatStats(
        combatSkillName,
        null,
        null,
        characterSheet.baseValues,
        combatStatsOld,
        params.body.skilledAttackValue.increasedPoints,
        params.body.skilledParadeValue.increasedPoints,
      );

      if (!combatStatsChanged(combatStatsOld, combatStats)) {
        throw new Error("Combat stats didn't change, but should have changed!");
      }

      await updateCombatStats(
        params.userId,
        params.pathParams["character-id"],
        combatCategory,
        combatSkillName,
        combatStats,
      );
    }

    const responseBody: UpdateCombatStatsResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      combatCategory: combatCategory,
      combatSkillName: combatSkillName,
      combatStats: {
        old: combatStatsOld,
        new: combatStats,
      },
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

    const pathParams = patchCombatStatsPathParamsSchema.parse(request.pathParameters);
    const body = patchCombatStatsRequestSchema.parse(request.body);

    const rangedCombatCategory: keyof CombatSection = "ranged";
    if (pathParams["combat-category"] === rangedCombatCategory && body.skilledParadeValue.increasedPoints != 0) {
      throw new HttpError(400, "Parade value for a ranged combat skill must be 0!");
    }

    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams: pathParams,
      body: body,
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    throw error;
  }
}

function validatePassedValues(combatStats: CombatStats, params: Parameters) {
  console.log("Compare passed combat stats with the stats in the backend");

  if (
    !idempotentUpdate(combatStats, params) &&
    (params.body.skilledAttackValue.initialValue !== combatStats.skilledAttackValue ||
      params.body.skilledParadeValue.initialValue !== combatStats.skilledParadeValue)
  ) {
    throw new HttpError(409, "The passed combat stats don't match the stats in the backend!", {
      characterId: params.pathParams["character-id"],
      combatSkillName: params.pathParams["combat-skill-name"],
      passedSkilledAttackValue: params.body.skilledAttackValue.initialValue,
      backendSkilledAttackValue: combatStats.skilledAttackValue,
      passedSkilledParadeValue: params.body.skilledParadeValue.initialValue,
      backendSkilledParadeValue: combatStats.skilledParadeValue,
    });
  }

  console.log("Passed combat stats match the stats in the backend");
}

function idempotentUpdate(combatStats: CombatStats, params: Parameters) {
  return (
    params.body.skilledAttackValue.initialValue + params.body.skilledAttackValue.increasedPoints ===
      combatStats.skilledAttackValue &&
    params.body.skilledParadeValue.initialValue + params.body.skilledParadeValue.increasedPoints ===
      combatStats.skilledParadeValue
  );
}
