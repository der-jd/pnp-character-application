import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { getAttribute, Attribute, CalculationPoints } from "config/index.js";
import {
  Request,
  parseBody,
  getCharacterItem,
  updateAttribute,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateUUID,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateAttribute({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const bodySchema = z
  .object({
    start: z
      .object({
        initialValue: z.number(),
        newValue: z.number(),
      })
      .strict()
      .optional(),
    current: z
      .object({
        initialValue: z.number(),
        increasedPoints: z.number(),
      })
      .strict()
      .optional(),
    mod: z
      .object({
        initialValue: z.number(),
        newValue: z.number(),
      })
      .strict()
      .optional(),
  })
  .strict();

interface Parameters {
  userId: string;
  characterId: string;
  attributeName: string;
  body: z.infer<typeof bodySchema>;
}

// TODO rename function, etc. to update-attribute
export async function _updateAttribute(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.characterId} of user ${params.userId}`);
    console.log(`Update attribute '${params.attributeName}'`);

    const character = await getCharacterItem(params.userId, params.characterId);
    const characterSheet = character.characterSheet;
    const attributePointsOld = characterSheet.calculationPoints.attributePoints;
    let attributePoints = structuredClone(attributePointsOld);
    const attributeOld = getAttribute(characterSheet.attributes, params.attributeName);
    let attribute = structuredClone(attributeOld);

    if (params.body.start) {
      attribute = updateStartValue(attribute, params.body.start);
    }

    if (params.body.current) {
      const result = updateCurrentValue(attribute, params.body.current, attributePoints);
      attribute = result.attribute;
      attributePoints = result.attributePoints;
    }

    if (params.body.mod) {
      attribute = updateModValue(attribute, params.body.mod);
    }

    await updateAttribute(params.userId, params.characterId, params.attributeName, attribute, attributePoints);

    // TODO Consider side effects of increasing attributes -> updated base values

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        userId: params.userId,
        attributeName: params.attributeName,
        attribute: {
          old: attributeOld,
          new: attribute,
        },
        attributePoints: {
          old: attributePointsOld,
          new: attributePoints,
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
    const attributeName = request.pathParameters?.["attribute-name"];
    if (typeof characterId !== "string" || typeof attributeName !== "string") {
      throw new HttpError(400, "Invalid input values!");
    }

    validateUUID(characterId);

    const body = bodySchema.parse(request.body);

    if (body.current && body.current.increasedPoints <= 0) {
      throw new HttpError(400, "Points to increase are negative or null! The value must be greater than or equal 1.", {
        increasedPoints: body.current.increasedPoints,
      });
    }

    return {
      userId: userId,
      characterId: characterId,
      attributeName: attributeName,
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

function updateStartValue(attribute: Attribute, startValue: any): Attribute {
  console.log(`Update start value of the attribute from ${startValue.initialValue} to ${startValue.newValue}`);

  if (startValue.initialValue !== attribute.start && startValue.newValue !== attribute.start) {
    throw new HttpError(409, "The passed attribute value doesn't match the value in the backend!", {
      passedStartValue: startValue.initialValue,
      backendStartValue: attribute.start,
    });
  }

  if (startValue.newValue === attribute.start) {
    console.log("Attribute start value already updated to target value. Nothing to do.");
    return attribute;
  } else {
    attribute.start = startValue.newValue;
    return attribute;
  }
}

function updateCurrentValue(
  attribute: Attribute,
  currentValue: any,
  attributePoints: CalculationPoints,
): { attribute: Attribute; attributePoints: CalculationPoints } {
  console.log(
    `Update current value of the attribute from ${currentValue.initialValue} to ${currentValue.initialValue + currentValue.increasedPoints}`,
  );

  if (
    currentValue.initialValue !== attribute.current &&
    currentValue.initialValue + currentValue.increasedPoints !== attribute.current
  ) {
    throw new HttpError(409, "The passed attribute value doesn't match the value in the backend!", {
      passedCurrentValue: currentValue.initialValue,
      backendCurrentValue: attribute.current,
    });
  }

  if (currentValue.initialValue + currentValue.increasedPoints === attribute.current) {
    console.log("Attribute current value already updated to target value. Nothing to do.");
    return { attribute, attributePoints };
  } else {
    console.log(`Attribute total cost before increasing: ${attribute.totalCost}`);
    console.log(`Available attribute points before increasing: ${attributePoints.available}`);

    const increaseCost = 1; // Increase cost are always 1 for attributes
    for (let i = 0; i < currentValue.increasedPoints; i++) {
      console.debug("---------------------------");

      if (increaseCost > attributePoints.available) {
        throw new HttpError(400, "Not enough attribute points to increase the attribute!");
      }

      console.debug(`Attribute value: ${attribute.current}`);
      console.debug(`Attribute total cost: ${attribute.totalCost}`);
      console.debug(`Available attribute points: ${attributePoints.available}`);
      console.debug(`Increasing attribute by 1 for ${increaseCost} attribute point...`);
      attribute.current += 1;
      attribute.totalCost += increaseCost;
      attributePoints.available -= increaseCost;
    }

    return { attribute, attributePoints };
  }
}

function updateModValue(attribute: Attribute, modValue: any): Attribute {
  console.log(`Update mod value of the attribute from ${modValue.initialValue} to ${modValue.newValue}`);

  if (modValue.initialValue !== attribute.mod && modValue.newValue !== attribute.mod) {
    throw new HttpError(409, "The passed attribute value doesn't match the value in the backend!", {
      passedModValue: modValue.initialValue,
      backendModValue: attribute.mod,
    });
  }

  if (modValue.newValue === attribute.mod) {
    console.log("Attribute mod value already updated to target value. Nothing to do.");
    return attribute;
  } else {
    attribute.mod = modValue.newValue;
    return attribute;
  }
}
