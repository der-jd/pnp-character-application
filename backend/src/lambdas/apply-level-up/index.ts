import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  headersSchema,
  postLevelUpPathParamsSchema,
  PostLevelUpPathParams,
  postLevelUpRequestSchema,
  PostLevelUpRequest,
  ApplyLevelUpResponse,
  CharacterSheet,
  BaseValues,
  LevelUpOption,
} from "api-spec";
import {
  Request,
  parseBody,
  decodeUserId,
  getCharacterItem,
  updateBaseValue,
  setLevelUp,
  logAndEnsureHttpError,
  HttpError,
  isZodError,
  logZodError,
  computeLevelUpOptionsHash,
  planApplyLevelUp,
  computeLevelUpOptions,
  setSpecialAbilities,
} from "core";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _applyLevelUp({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: PostLevelUpPathParams;
  body: PostLevelUpRequest;
}

/**
 * This function is NOT idempotent!
 */
export async function _applyLevelUp(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    const characterId = params.pathParams["character-id"];
    const character = await getCharacterItem(params.userId, characterId);
    const characterSheet = character.characterSheet;

    console.log(
      `Apply level-up to level ${params.body.initialLevel + 1} for character ${characterId} of user ${params.userId}`,
    );
    console.log("Chosen effect:", params.body.effect.kind);

    if (invalidInitialLevel(params, characterSheet.generalInformation.level)) {
      throw new HttpError(409, "The passed initial level doesn't match the value in the backend!", {
        passedInitialLevel: params.body.initialLevel,
        backendInitialLevel: characterSheet.generalInformation.level,
      });
    }

    const options = computeLevelUpOptions(
      characterSheet.generalInformation.level + 1,
      characterSheet.generalInformation.levelUpProgress,
    );

    if (invalidLevelUpOptions(params, options)) {
      throw new HttpError(409, "Options have changed. Please refresh level-up options and retry.", {
        passedOptionsHash: params.body.optionsHash,
        backendOptionsHash: computeLevelUpOptionsHash(options),
      });
    }

    if (selectedLevelUpEffectNotAllowed(params, options)) {
      throw new HttpError(400, `Selected effect '${params.body.effect.kind}' is not allowed for this level`, {
        selectedEffect: params.body.effect.kind,
        nextLevel: characterSheet.generalInformation.level + 1,
      });
    }

    const plan = planApplyLevelUp(characterSheet, params.body.effect);

    await setLevelUp(params.userId, characterId, plan.level, plan.levelUpProgress);

    const updates: Promise<void>[] = [];
    if (plan.baseValues) {
      for (const baseValueName of Object.keys(plan.baseValues) as (keyof BaseValues)[]) {
        const baseValueUpdate = plan.baseValues[baseValueName];

        if (!baseValueUpdate) {
          continue;
        }

        updates.push(updateBaseValue(params.userId, characterId, baseValueName, baseValueUpdate));
      }
      await Promise.all(updates);
    }

    if (plan.specialAbilities) {
      await setSpecialAbilities(params.userId, characterId, plan.specialAbilities);
    }

    const oldBaseValues = plan.baseValues
      ? Object.keys(plan.baseValues).reduce<Partial<CharacterSheet["baseValues"]>>((accumulated, key) => {
          const typedKey = key as keyof CharacterSheet["baseValues"];
          const baseValue = characterSheet.baseValues[typedKey];

          if (baseValue) {
            accumulated[typedKey] = baseValue;
          }

          return accumulated;
        }, {})
      : undefined;

    const responseBody: ApplyLevelUpResponse = {
      characterId,
      userId: params.userId,
      effectKind: params.body.effect.kind,
      changes: {
        old: {
          level: characterSheet.generalInformation.level,
          levelUpProgress: characterSheet.generalInformation.levelUpProgress,
          baseValues: oldBaseValues,
          specialAbilities: plan.specialAbilities ? characterSheet.specialAbilities : undefined,
        },
        new: {
          level: plan.level,
          levelUpProgress: plan.levelUpProgress,
          baseValues: plan.baseValues,
          specialAbilities: plan.specialAbilities,
        },
      },
    };

    const response = {
      statusCode: 200,
      body: JSON.stringify(responseBody, (key, value) => (typeof value === "bigint" ? value.toString() : value)),
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

    const pathParams = postLevelUpPathParamsSchema.parse(request.pathParameters);
    const body = postLevelUpRequestSchema.parse(request.body);

    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams,
      body,
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    throw error;
  }
}

function invalidInitialLevel(params: Parameters, currentLevel: number): boolean {
  return params.body.initialLevel !== currentLevel;
}

function invalidLevelUpOptions(params: Parameters, options: LevelUpOption[]): boolean {
  return computeLevelUpOptionsHash(options) !== params.body.optionsHash;
}

function selectedLevelUpEffectNotAllowed(params: Parameters, options: LevelUpOption[]): boolean {
  const chosen = options.find((o) => o.kind === params.body.effect.kind);
  return !chosen || !chosen.allowed;
}
