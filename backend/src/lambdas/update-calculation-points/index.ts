import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CalculationPoints,
  headersSchema,
  PatchCalculationPointsPathParams,
  PatchCalculationPointsRequest,
  UpdateCalculationPointsResponse,
  patchCalculationPointsPathParamsSchema,
  patchCalculationPointsRequestSchema,
  InitialNew,
  InitialIncreased,
} from "api-spec";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  updateAdventurePoints,
  updateAttributePoints,
  isZodError,
  logZodError,
} from "core";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateCalculationPoints({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: PatchCalculationPointsPathParams;
  body: PatchCalculationPointsRequest;
}

export async function _updateCalculationPoints(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.pathParams["character-id"]} of user ${params.userId}`);
    console.log("Update calculation points");

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);
    const characterSheet = character.characterSheet;
    const adventurePointsOld = characterSheet.calculationPoints.adventurePoints;
    const attributePointsOld = characterSheet.calculationPoints.attributePoints;
    let adventurePoints = structuredClone(adventurePointsOld);
    let attributePoints = structuredClone(attributePointsOld);
    const updates: Promise<void>[] = [];

    if (params.body.adventurePoints) {
      console.log("Update adventure points");

      if (params.body.adventurePoints.start) {
        adventurePoints = updateStartValue(adventurePoints, params.body.adventurePoints.start);
      }

      if (params.body.adventurePoints.total) {
        adventurePoints = updateTotalValue(adventurePoints, params.body.adventurePoints.total);
      }

      updates.push(updateAdventurePoints(params.userId, params.pathParams["character-id"], adventurePoints));
    }

    if (params.body.attributePoints) {
      console.log("Update attribute points");

      if (params.body.attributePoints.start) {
        attributePoints = updateStartValue(attributePoints, params.body.attributePoints.start);
      }

      if (params.body.attributePoints.total) {
        attributePoints = updateTotalValue(attributePoints, params.body.attributePoints.total);
      }

      updates.push(updateAttributePoints(params.userId, params.pathParams["character-id"], attributePoints));
    }

    await Promise.all(updates);

    const responseBody: UpdateCalculationPointsResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      calculationPoints: {
        old: {
          adventurePoints: params.body.adventurePoints ? adventurePointsOld : undefined,
          attributePoints: params.body.attributePoints ? attributePointsOld : undefined,
        },
        new: {
          adventurePoints: params.body.adventurePoints ? adventurePoints : undefined,
          attributePoints: params.body.attributePoints ? attributePoints : undefined,
        },
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

    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams: patchCalculationPointsPathParamsSchema.parse(request.pathParameters),
      body: patchCalculationPointsRequestSchema.parse(request.body),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    throw error;
  }
}

function updateStartValue(calculationPoints: CalculationPoints, startValue: InitialNew): CalculationPoints {
  console.log(`Update start value of the calculation points from ${startValue.initialValue} to ${startValue.newValue}`);

  if (startValue.initialValue !== calculationPoints.start && startValue.newValue !== calculationPoints.start) {
    throw new HttpError(409, "The passed calculation points value doesn't match the value in the backend!", {
      passedStartValue: startValue.initialValue,
      backendStartValue: calculationPoints.start,
    });
  }

  if (startValue.newValue === calculationPoints.start) {
    console.log("Calculation points start value already updated to target value. Nothing to do.");
    return calculationPoints;
  } else {
    calculationPoints.start = startValue.newValue;
    return calculationPoints;
  }
}

function updateTotalValue(calculationPoints: CalculationPoints, totalValue: InitialIncreased): CalculationPoints {
  console.log(
    `Update total calculation points from ${totalValue.initialValue} to ${totalValue.initialValue + totalValue.increasedPoints}`
  );

  if (
    totalValue.initialValue !== calculationPoints.total &&
    totalValue.initialValue + totalValue.increasedPoints !== calculationPoints.total
  ) {
    throw new HttpError(409, "The passed calculation points value doesn't match the value in the backend!", {
      passedTotalValue: totalValue.initialValue,
      backendTotalValue: calculationPoints.total,
    });
  }

  if (totalValue.initialValue + totalValue.increasedPoints === calculationPoints.total) {
    console.log("Total calculation points already updated to target value. Nothing to do.");
    return calculationPoints;
  } else {
    console.log(`Total points before increasing: ${calculationPoints.total}`);
    console.log(`Available points before increasing: ${calculationPoints.available}`);
    calculationPoints.total += totalValue.increasedPoints;
    calculationPoints.available += totalValue.increasedPoints;
    console.log(`Total points after increasing: ${calculationPoints.total}`);
    console.log(`Available points after increasing: ${calculationPoints.available}`);

    return calculationPoints;
  }
}
