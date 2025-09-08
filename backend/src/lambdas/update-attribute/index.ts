import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getAttribute, calculateBaseValues } from "config";
import {
  updateAttributePathParamsSchema,
  UpdateAttributePathParams,
  updateAttributeRequestSchema,
  UpdateAttributeRequest,
  UpdateAttributeResponse,
  headersSchema,
  Attribute,
  CalculationPoints,
  CharacterSheet,
  InitialNew,
  InitialIncreased,
} from "api-spec";
import {
  Request,
  parseBody,
  getCharacterItem,
  updateAttribute,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  updateBaseValue,
  isZodError,
  logZodError,
} from "utils";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateAttribute({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: UpdateAttributePathParams;
  body: UpdateAttributeRequest;
}

export async function _updateAttribute(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.pathParams["character-id"]} of user ${params.userId}`);
    console.log(`Update attribute '${params.pathParams["attribute-name"]}'`);

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);
    const characterSheet = character.characterSheet;
    const attributePointsOld = characterSheet.calculationPoints.attributePoints;
    let attributePoints = structuredClone(attributePointsOld);
    const attributeOld = getAttribute(characterSheet.attributes, params.pathParams["attribute-name"]);
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

    await updateAttribute(
      params.userId,
      params.pathParams["character-id"],
      params.pathParams["attribute-name"],
      attribute,
      attributePoints,
    );

    console.log("Calculate base values");
    const baseValuesOld = characterSheet.baseValues;
    let baseValuesNew: CharacterSheet["baseValues"] | undefined;
    const attributesNew = structuredClone(characterSheet.attributes);
    attributesNew[params.pathParams["attribute-name"] as keyof CharacterSheet["attributes"]] = attribute;
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
        updates.push(
          updateBaseValue(
            params.userId,
            params.pathParams["character-id"],
            baseValueName,
            baseValuesNew[baseValueName],
          ),
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    } else {
      console.log("No base values changed, nothing to update.");
    }

    const responseBody: UpdateAttributeResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      attributeName: params.pathParams["attribute-name"],
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
      pathParams: updateAttributePathParamsSchema.parse(request.pathParameters),
      body: updateAttributeRequestSchema.parse(request.body),
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

function updateStartValue(attribute: Attribute, startValue: InitialNew): Attribute {
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
  currentValue: InitialIncreased,
  attributePoints: CalculationPoints,
): { attribute: Attribute; attributePoints: CalculationPoints } {
  console.log(
    `Update current value of the attribute from ${currentValue.initialValue} to ${currentValue.initialValue + currentValue.increasedPoints}`,
  );

  if (currentValue.increasedPoints <= 0) {
    throw new HttpError(400, "Points to increase are negative or null! The value must be greater than or equal 1.", {
      increasedPoints: currentValue.increasedPoints,
    });
  }

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

function updateModValue(attribute: Attribute, modValue: InitialNew): Attribute {
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
