import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  patchBaseValuePathParamsSchema,
  PatchBaseValuePathParams,
  patchBaseValueRequestSchema,
  PatchBaseValueRequest,
  UpdateBaseValueResponse,
  headersSchema,
  BaseValue,
  CharacterSheet,
  InitialNew,
  baseValuesUpdatableByLvlUp,
  CombatSection,
} from "api-spec";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  updateBaseValue,
  isZodError,
  logZodError,
  getBaseValue,
  combatBaseValuesChangedAffectingCombatStats,
  recalculateAndUpdateCombatStats,
} from "core";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateBaseValue({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: PatchBaseValuePathParams;
  body: PatchBaseValueRequest;
}

export async function _updateBaseValue(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.pathParams["character-id"]} of user ${params.userId}`);
    console.log(`Update base value '${params.pathParams["base-value-name"]}'`);

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);
    const characterSheet = character.characterSheet;
    const baseValueOld = getBaseValue(characterSheet.baseValues, params.pathParams["base-value-name"]);
    let baseValue = structuredClone(baseValueOld);

    if (params.body.start) {
      baseValue = updateStartValue(baseValue, params.body.start);
    }

    if (params.body.byLvlUp) {
      baseValue = updateByLvlUpValue(params.pathParams["base-value-name"], baseValue, params.body.byLvlUp);
    }

    if (params.body.mod) {
      baseValue = updateModValue(baseValue, params.body.mod);
    }

    await updateBaseValue(
      params.userId,
      params.pathParams["character-id"],
      params.pathParams["base-value-name"],
      baseValue
    );

    const combatBaseValueChanged: boolean = combatBaseValuesChangedAffectingCombatStats(
      { [params.pathParams["base-value-name"]]: baseValueOld },
      {
        [params.pathParams["base-value-name"]]: baseValue,
      }
    );
    let changedCombatSection: Partial<CombatSection> = {};
    if (combatBaseValueChanged) {
      changedCombatSection = await recalculateAndUpdateCombatStats(
        params.userId,
        params.pathParams["character-id"],
        characterSheet.combat,
        {
          ...characterSheet.baseValues,
          [params.pathParams["base-value-name"]]: baseValue,
        }
      );
    }

    const responseBody: UpdateBaseValueResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      baseValueName: params.pathParams["base-value-name"],
      changes: {
        old: {
          baseValue: baseValueOld,
          combat: combatBaseValueChanged
            ? Object.fromEntries(Object.entries(characterSheet.combat).filter(([k]) => k in changedCombatSection))
            : undefined,
        },
        new: {
          baseValue: baseValue,
          combat: combatBaseValueChanged ? changedCombatSection : undefined,
        },
      },
    };
    const response = {
      statusCode: 200,
      body: JSON.stringify(responseBody, (key, value) => {
        return typeof value === "bigint" ? value.toString() : value;
      }),
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

    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams: patchBaseValuePathParamsSchema.parse(request.pathParameters),
      body: patchBaseValueRequestSchema.parse(request.body),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    throw error;
  }
}

function updateStartValue(baseValue: BaseValue, startValue: InitialNew): BaseValue {
  console.log(`Update start value of the base value from ${startValue.initialValue} to ${startValue.newValue}`);

  if (startValue.initialValue !== baseValue.start && startValue.newValue !== baseValue.start) {
    throw new HttpError(409, "The passed base value doesn't match the value in the backend!", {
      passedStartValue: startValue.initialValue,
      backendStartValue: baseValue.start,
    });
  }

  if (startValue.newValue === baseValue.start) {
    console.log("Base value start value already updated to target value. Nothing to do.");
    return baseValue;
  } else {
    baseValue.start = startValue.newValue;
    return baseValue;
  }
}

function updateByLvlUpValue(
  baseValueName: keyof CharacterSheet["baseValues"] | string,
  baseValue: BaseValue,
  byLvlUp: InitialNew
): BaseValue {
  console.log(`Update byLvlUp value of the base value from ${byLvlUp.initialValue} to ${byLvlUp.newValue}`);

  if (!baseValuesUpdatableByLvlUp.includes(baseValueName as keyof CharacterSheet["baseValues"])) {
    throw new HttpError(400, "'By level up' changes are not allowed for this base value!", {
      baseValueName: baseValueName,
    });
  }

  if (byLvlUp.initialValue !== baseValue.byLvlUp && byLvlUp.newValue !== baseValue.byLvlUp) {
    throw new HttpError(409, "The passed byLvlUp value doesn't match the value in the backend!", {
      passedByLvlUpValue: byLvlUp.initialValue,
      backendByLvlUpValue: baseValue.byLvlUp,
    });
  }

  if (byLvlUp.newValue === baseValue.byLvlUp) {
    console.log("Base value byLvlUp value already updated to target value. Nothing to do.");
    return baseValue;
  } else {
    baseValue.byLvlUp = byLvlUp.newValue;
    const diffByLvlUp = byLvlUp.newValue - byLvlUp.initialValue;
    baseValue.current += diffByLvlUp;
    return baseValue;
  }
}

function updateModValue(baseValue: BaseValue, modValue: InitialNew): BaseValue {
  console.log(`Update mod value of the base value from ${modValue.initialValue} to ${modValue.newValue}`);

  if (modValue.initialValue !== baseValue.mod && modValue.newValue !== baseValue.mod) {
    throw new HttpError(409, "The passed base value doesn't match the value in the backend!", {
      passedModValue: modValue.initialValue,
      backendModValue: baseValue.mod,
    });
  }

  if (modValue.newValue === baseValue.mod) {
    console.log("Base value mod value already updated to target value. Nothing to do.");
    return baseValue;
  } else {
    baseValue.mod = modValue.newValue;
    return baseValue;
  }
}
