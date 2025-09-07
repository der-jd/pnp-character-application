import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getCombatValues } from "config";
import {
  headersSchema,
  UpdateCombatValuesPathParams,
  UpdateCombatValuesRequest,
  UpdateCombatValuesResponse,
  updateCombatValuesPathParamsSchema,
  updateCombatValuesRequestSchema,
  Character,
  CombatValues,
} from "shared";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  updateCombatValues,
  isZodError,
  logZodError,
} from "utils";

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
  pathParams: UpdateCombatValuesPathParams;
  body: UpdateCombatValuesRequest;
}

export async function _updateCombatValues(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.pathParams["character-id"]} of user ${params.userId}`);
    console.log(
      `Update attack/parade value of combat skill '${params.pathParams["combat-category"]}/${params.pathParams["combat-skill-name"]}' from ` +
        `${params.body.attackValue.initialValue}/${params.body.paradeValue.initialValue} to ` +
        `${params.body.attackValue.initialValue + params.body.attackValue.increasedPoints}/${params.body.paradeValue.initialValue + params.body.paradeValue.increasedPoints}`,
    );

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);

    const characterSheet = character.characterSheet;
    const combatCategory = params.pathParams["combat-category"] as keyof Character["characterSheet"]["combatValues"];
    const skillCombatValuesOld = getCombatValues(
      characterSheet.combatValues,
      combatCategory,
      params.pathParams["combat-skill-name"],
    );
    const skillCombatValues = structuredClone(skillCombatValuesOld);

    if (
      params.body.attackValue.initialValue + params.body.attackValue.increasedPoints ===
        skillCombatValues.attackValue &&
      params.body.paradeValue.initialValue + params.body.paradeValue.increasedPoints === skillCombatValues.paradeValue
    ) {
      console.log("Combat values already updated to target value. Nothing to do.");

      const responseBody: UpdateCombatValuesResponse = {
        characterId: params.pathParams["character-id"],
        userId: params.userId,
        combatCategory: params.pathParams["combat-category"],
        combatSkillName: params.pathParams["combat-skill-name"],
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
    }

    validatePassedValues(skillCombatValues, params);

    const combatValuesWithIncreases = [
      {
        valueName: "attack value",
        value: skillCombatValues.attackValue,
        increased: params.body.attackValue.increasedPoints,
      },
      {
        valueName: "parade value",
        value: skillCombatValues.paradeValue,
        increased: params.body.paradeValue.increasedPoints,
      },
    ];
    const increaseCost = 1; // Increase cost are always 1 for combat values

    console.log(`Available points before increasing: ${skillCombatValues.availablePoints}`);
    for (const combatValue of combatValuesWithIncreases) {
      const { valueName, increased } = combatValue;
      let value = combatValue.value;
      console.log(`Increasing ${valueName} from ${value} by ${increased} points...`);
      for (let i = 0; i < increased; i++) {
        console.debug("---------------------------");

        if (increaseCost > skillCombatValues.availablePoints) {
          throw new HttpError(400, "Not enough points to increase the combat value!", {
            characterId: params.pathParams["character-id"],
            combatValueName: valueName,
          });
        }

        console.debug(`Combat value: ${value}`);
        console.debug(`Available points: ${skillCombatValues.availablePoints}`);
        console.debug(`Increasing combat value by 1 for ${increaseCost} point...`);
        value += 1;
        skillCombatValues.availablePoints -= increaseCost;
      }
      skillCombatValues[valueName === "attack value" ? "attackValue" : "paradeValue"] = value;
    }

    await updateCombatValues(
      params.userId,
      params.pathParams["character-id"],
      combatCategory,
      params.pathParams["combat-skill-name"],
      skillCombatValues,
    );

    const responseBody: UpdateCombatValuesResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      combatCategory: params.pathParams["combat-category"],
      combatSkillName: params.pathParams["combat-skill-name"],
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
    throw ensureHttpError(error);
  }
}

function validateRequest(request: Request): Parameters {
  try {
    console.log("Validate request");

    const pathParams = updateCombatValuesPathParamsSchema.parse(request.pathParameters);
    const body = updateCombatValuesRequestSchema.parse(request.body);

    if (pathParams["combat-category"] === "ranged" && body.paradeValue.increasedPoints != 0) {
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

  // Values are valid if the passed values have already been applied (idempotent operation)
  if (
    (params.body.attackValue.initialValue !== combatValues.attackValue &&
      params.body.attackValue.initialValue + params.body.attackValue.increasedPoints !== combatValues.attackValue) ||
    (params.body.paradeValue.initialValue !== combatValues.paradeValue &&
      params.body.paradeValue.initialValue + params.body.paradeValue.increasedPoints !== combatValues.paradeValue)
  ) {
    throw new HttpError(409, "The passed skill combat values don't match the values in the backend!", {
      characterId: params.pathParams["character-id"],
      combatSkillName: params.pathParams["combat-skill-name"],
      passedAttackValue: params.body.attackValue.initialValue,
      backendAttackValue: combatValues.attackValue,
      passedParadeValue: params.body.paradeValue.initialValue,
      backendParadeValue: combatValues.paradeValue,
    });
  }

  console.log("Passed skill combat values match the values in the backend");
}
