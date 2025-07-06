import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { getAttribute, Attribute, CalculationPoints, CharacterSheet, calculateBaseValues } from "config/index.js";
import {
  Request,
  parseBody,
  getCharacterItem,
  updateAttribute,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateUUID,
  updateBaseValue,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateAttribute({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const initialNewSchema = z.object({
  initialValue: z.number(),
  newValue: z.number(),
});

const initialIncreasedSchema = z.object({
  initialValue: z.number(),
  increasedPoints: z.number(),
});

const bodySchema = z
  .object({
    start: initialNewSchema.strict().optional(),
    current: initialIncreasedSchema.strict().optional(),
    mod: initialNewSchema.strict().optional(),
  })
  .strict();

interface Parameters {
  userId: string;
  characterId: string;
  attributeName: string;
  body: z.infer<typeof bodySchema>;
}

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

    console.log("Calculate base values");
    const baseValuesOld = characterSheet.baseValues;
    let baseValuesNew: CharacterSheet["baseValues"] | undefined;
    const attributesNew = structuredClone(characterSheet.attributes);
    attributesNew[params.attributeName as keyof CharacterSheet["attributes"]] = attribute;
    const newBaseValuesByFormula = calculateBaseValues(attributesNew);
    const updates: Promise<void>[] = [];
    const changedBaseValues: Partial<CharacterSheet["baseValues"]> = {};

    for (const baseValueName of Object.keys(baseValuesOld) as (keyof CharacterSheet["baseValues"])[]) {
      const oldBaseValue = baseValuesOld[baseValueName];
      const newFormulaValue = newBaseValuesByFormula[baseValueName];

      if (oldBaseValue.byFormula && newFormulaValue !== oldBaseValue.byFormula) {
        if (!baseValuesNew) {
          baseValuesNew = structuredClone(baseValuesOld);
        }

        const diffByFormula = newFormulaValue - oldBaseValue.byFormula;
        baseValuesNew[baseValueName].byFormula = newFormulaValue;
        baseValuesNew[baseValueName].current += diffByFormula;
        changedBaseValues[baseValueName] = baseValuesNew[baseValueName];
        console.log(`Update base value '${baseValueName}'`);
        console.log("Old base value:", oldBaseValue);
        console.log("New base value:", changedBaseValues[baseValueName]);
        updates.push(updateBaseValue(params.userId, params.characterId, baseValueName, baseValuesNew[baseValueName]));
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    } else {
      console.log("No base values changed, nothing to update.");
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        userId: params.userId,
        attributeName: params.attributeName,
        changes: {
          old: {
            attribute: attributeOld,
            baseValues:
              Object.keys(changedBaseValues).length > 0
                ? Object.fromEntries(Object.entries(baseValuesOld).filter(([k]) => k in changedBaseValues))
                : undefined,
          },
          new: {
            attribute: attribute,
            baseValues: Object.keys(changedBaseValues).length > 0 ? changedBaseValues : undefined,
          },
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

function updateStartValue(attribute: Attribute, startValue: z.infer<typeof initialNewSchema>): Attribute {
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
  currentValue: z.infer<typeof initialIncreasedSchema>,
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

function updateModValue(attribute: Attribute, modValue: z.infer<typeof initialNewSchema>): Attribute {
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
