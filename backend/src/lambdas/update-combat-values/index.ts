import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  headersSchema,
  PatchCombatValuesPathParams,
  PatchCombatValuesRequest,
  UpdateCombatValuesResponse,
  patchCombatValuesPathParamsSchema,
  patchCombatValuesRequestSchema,
  CombatValues,
  SkillName,
  CharacterSheet,
} from "api-spec";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  updateCombatValues,
  isZodError,
  logZodError,
  getCombatValues,
  calculateCombatValues,
  combatValuesChanged,
} from "core";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateCombatValues({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: PatchCombatValuesPathParams;
  body: PatchCombatValuesRequest;
}

export async function _updateCombatValues(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);
    const combatCategory = params.pathParams["combat-category"] as keyof CharacterSheet["combatValues"];
    const combatSkillName = params.pathParams["combat-skill-name"] as SkillName;

    console.log(`Update character ${params.pathParams["character-id"]} of user ${params.userId}`);
    console.log(
      `Update skilled attack/parade value of combat skill '${combatCategory}/${combatSkillName}' from ` +
        `${params.body.skilledAttackValue.initialValue}/${params.body.skilledParadeValue.initialValue} to ` +
        `${params.body.skilledAttackValue.initialValue + params.body.skilledAttackValue.increasedPoints}/${params.body.skilledParadeValue.initialValue + params.body.skilledParadeValue.increasedPoints}`,
    );

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);

    const characterSheet = character.characterSheet;
    const skillCombatValuesOld = getCombatValues(characterSheet.combatValues, combatCategory, combatSkillName);
    let skillCombatValues = skillCombatValuesOld;

    validatePassedValues(skillCombatValuesOld, params);

    if (idempotentUpdate(skillCombatValuesOld, params)) {
      console.log("Combat values already updated to target value. Nothing to do.");
    } else {
      skillCombatValues = calculateCombatValues(
        combatSkillName,
        null,
        null,
        characterSheet.baseValues.attackBaseValue,
        characterSheet.baseValues.paradeBaseValue,
        characterSheet.baseValues.rangedAttackBaseValue,
        skillCombatValuesOld,
        params.body.skilledAttackValue.increasedPoints,
        params.body.skilledParadeValue.increasedPoints,
      );

      if (!combatValuesChanged(skillCombatValuesOld, skillCombatValues)) {
        throw new Error("Combat values didn't change, but should have changed!");
      }

      await updateCombatValues(
        params.userId,
        params.pathParams["character-id"],
        combatCategory,
        combatSkillName,
        skillCombatValues,
      );
    }

    const responseBody: UpdateCombatValuesResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      combatCategory: combatCategory,
      combatSkillName: combatSkillName,
      combatValues: {
        old: skillCombatValuesOld,
        new: skillCombatValues,
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

    const pathParams = patchCombatValuesPathParamsSchema.parse(request.pathParameters);
    const body = patchCombatValuesRequestSchema.parse(request.body);

    const rangedCombatCategory: keyof CharacterSheet["combatValues"] = "ranged";
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

    // Rethrow other errors
    throw error;
  }
}

function validatePassedValues(combatValues: CombatValues, params: Parameters) {
  console.log("Compare passed skill combat values with the values in the backend");

  if (
    !idempotentUpdate(combatValues, params) &&
    (params.body.skilledAttackValue.initialValue !== combatValues.skilledAttackValue ||
      params.body.skilledParadeValue.initialValue !== combatValues.skilledParadeValue)
  ) {
    throw new HttpError(409, "The passed skill combat values don't match the values in the backend!", {
      characterId: params.pathParams["character-id"],
      combatSkillName: params.pathParams["combat-skill-name"],
      passedSkilledAttackValue: params.body.skilledAttackValue.initialValue,
      backendSkilledAttackValue: combatValues.skilledAttackValue,
      passedSkilledParadeValue: params.body.skilledParadeValue.initialValue,
      backendSkilledParadeValue: combatValues.skilledParadeValue,
    });
  }

  console.log("Passed skill combat values match the values in the backend");
}

function idempotentUpdate(combatValues: CombatValues, params: Parameters) {
  return (
    params.body.skilledAttackValue.initialValue + params.body.skilledAttackValue.increasedPoints ===
      combatValues.skilledAttackValue &&
    params.body.skilledParadeValue.initialValue + params.body.skilledParadeValue.increasedPoints ===
      combatValues.skilledParadeValue
  );
}
