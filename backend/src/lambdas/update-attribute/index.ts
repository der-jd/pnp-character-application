import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  patchAttributePathParamsSchema,
  PatchAttributePathParams,
  patchAttributeRequestSchema,
  PatchAttributeRequest,
  UpdateAttributeResponse,
  headersSchema,
  Attribute,
  CalculationPoints,
  CharacterSheet,
  InitialNew,
  InitialIncreased,
  SkillName,
  BaseValues,
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
  getAttribute,
  calculateBaseValues,
  calculateCombatValues,
  combatValuesChanged,
  updateCombatValues,
} from "core";

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
  pathParams: PatchAttributePathParams;
  body: PatchAttributeRequest;
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
    let baseValuesNew: BaseValues | undefined;
    const attributesNew = structuredClone(characterSheet.attributes);
    attributesNew[params.pathParams["attribute-name"] as keyof CharacterSheet["attributes"]] = attribute;
    const newBaseValuesByFormula = calculateBaseValues(attributesNew);
    const updates: Promise<void>[] = [];
    const changedBaseValues: Partial<BaseValues> = {};

    for (const baseValueName of Object.keys(baseValuesOld) as (keyof BaseValues)[]) {
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

    const baseValuesChanged = Object.keys(changedBaseValues).length > 0;

    if (baseValuesChanged) {
      await Promise.all(updates);
    } else {
      console.log("No base values changed, nothing to update.");
    }

    const combatBaseValueChanged: boolean =
      (changedBaseValues.attackBaseValue !== undefined ||
        changedBaseValues.paradeBaseValue !== undefined ||
        changedBaseValues.rangedAttackBaseValue !== undefined) &&
      baseValuesNew !== undefined;
    let changedCombatValues: Partial<CharacterSheet["combatValues"]> = {};
    if (combatBaseValueChanged) {
      changedCombatValues = await recalculateAndUpdateCombatValues(
        params.userId,
        params.pathParams["character-id"],
        characterSheet.combatValues,
        baseValuesNew!,
      );
    }

    // TODO update response body
    const responseBody: UpdateAttributeResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      attributeName: params.pathParams["attribute-name"],
      changes: {
        old: {
          attribute: attributeOld,
          baseValues: baseValuesChanged
            ? Object.fromEntries(Object.entries(baseValuesOld).filter(([k]) => k in changedBaseValues))
            : undefined,
          combatValues: combatBaseValueChanged ? characterSheet.combatValues : undefined,
        },
        new: {
          attribute: attribute,
          baseValues: baseValuesChanged ? changedBaseValues : undefined,
          combatValues: combatBaseValueChanged ? changedCombatValues : undefined,
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
      pathParams: patchAttributePathParamsSchema.parse(request.pathParameters),
      body: patchAttributeRequestSchema.parse(request.body),
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

async function recalculateAndUpdateCombatValues(
  userId: string,
  characterId: string,
  combatValues: CharacterSheet["combatValues"],
  baseValues: BaseValues,
): Promise<Partial<CharacterSheet["combatValues"]>> {
  console.log("Recalculate and update combat values");
  const combatValueUpdates: Promise<void>[] = [];
  const changedCombatValues: Partial<CharacterSheet["combatValues"]> = {};

  const combatCategories = Object.keys(combatValues) as (keyof CharacterSheet["combatValues"])[];
  for (const category of combatCategories) {
    for (const [skillName, oldCombatValues] of Object.entries(combatValues[category])) {
      const newCombatValues = calculateCombatValues(skillName as SkillName, null, null, baseValues, oldCombatValues);

      if (combatValuesChanged(oldCombatValues, newCombatValues)) {
        console.log(`Combat values for ${category}/${skillName} changed. Persisting...`);
        combatValueUpdates.push(updateCombatValues(userId, characterId, category, skillName, newCombatValues));
        changedCombatValues[category][skillName] = newCombatValues;
      }
    }
  }

  if (combatValueUpdates.length > 0) {
    await Promise.all(combatValueUpdates);
  } else {
    console.log("No combat values changed, nothing to update.");
  }

  return changedCombatValues;
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
