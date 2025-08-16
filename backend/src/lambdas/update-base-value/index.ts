import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { CharacterSheet, BaseValue, baseValuesNotUpdatableByLvlUp, getBaseValue } from "config/index.js";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateUUID,
  updateBaseValue,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateBaseValue({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const initialNewSchema = z.object({
  initialValue: z.number().int(),
  newValue: z.number().int(),
});

const bodySchema = z
  .object({
    start: initialNewSchema.strict().optional(),
    byLvlUp: initialNewSchema.strict().optional(),
    mod: initialNewSchema.strict().optional(),
  })
  .strict();

interface Parameters {
  userId: string;
  characterId: string;
  baseValueName: string;
  body: z.infer<typeof bodySchema>;
}

export async function _updateBaseValue(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.characterId} of user ${params.userId}`);
    console.log(`Update base value '${params.baseValueName}'`);

    const character = await getCharacterItem(params.userId, params.characterId);
    const characterSheet = character.characterSheet;
    const baseValueOld = getBaseValue(characterSheet.baseValues, params.baseValueName);
    let baseValue = structuredClone(baseValueOld);

    if (params.body.start) {
      baseValue = updateStartValue(baseValue, params.body.start);
    }

    if (params.body.byLvlUp) {
      baseValue = updateByLvlUpValue(params.baseValueName, baseValue, params.body.byLvlUp);
    }

    if (params.body.mod) {
      baseValue = updateModValue(baseValue, params.body.mod);
    }

    await updateBaseValue(params.userId, params.characterId, params.baseValueName, baseValue);

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        userId: params.userId,
        baseValueName: params.baseValueName,
        baseValue: {
          old: baseValueOld,
          new: baseValue,
        },
      }),
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

    const userId = decodeUserId(request.headers.authorization ?? request.headers.Authorization);

    const characterId = request.pathParameters?.["character-id"];
    const baseValueName = request.pathParameters?.["base-value-name"];
    if (typeof characterId !== "string" || typeof baseValueName !== "string") {
      throw new HttpError(400, "Invalid input values!");
    }

    validateUUID(characterId);

    const body = bodySchema.parse(request.body);

    return {
      userId: userId,
      characterId: characterId,
      baseValueName: baseValueName,
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

function updateStartValue(baseValue: BaseValue, startValue: z.infer<typeof initialNewSchema>): BaseValue {
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
  byLvlUp: z.infer<typeof initialNewSchema>,
): BaseValue {
  console.log(`Update byLvlUp value of the base value from ${byLvlUp.initialValue} to ${byLvlUp.newValue}`);

  if (baseValuesNotUpdatableByLvlUp.includes(baseValueName as keyof CharacterSheet["baseValues"])) {
    throw new HttpError(409, "'By level up' changes are not allowed for this base value!", {
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

function updateModValue(baseValue: BaseValue, modValue: z.infer<typeof initialNewSchema>): BaseValue {
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
