import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { CalculationPoints } from "config/index.js";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateUUID,
  updateAdventurePoints,
  updateAttributePoints,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _updateCalculationPoints({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const bodySchema = z
  .object({
    adventurePoints: z
      .object({
        start: z
          .object({
            initialValue: z.number(),
            newValue: z.number(),
          })
          .strict()
          .optional(),
        total: z
          .object({
            initialValue: z.number(),
            increasedPoints: z.number(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    attributePoints: z
      .object({
        start: z
          .object({
            initialValue: z.number(),
            newValue: z.number(),
          })
          .strict()
          .optional(),
        total: z
          .object({
            initialValue: z.number(),
            increasedPoints: z.number(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

interface Parameters {
  userId: string;
  characterId: string;
  body: z.infer<typeof bodySchema>;
}

export async function _updateCalculationPoints(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.characterId} of user ${params.userId}`);
    console.log("Update calculation points");

    const character = await getCharacterItem(params.userId, params.characterId);
    const characterSheet = character.characterSheet;
    const adventurePointsOld = characterSheet.calculationPoints.adventurePoints;
    const attributePointsOld = characterSheet.calculationPoints.attributePoints;
    let adventurePoints = structuredClone(adventurePointsOld);
    let attributePoints = structuredClone(attributePointsOld);

    if (params.body.adventurePoints) {
      console.log("Update adventure points");

      if (params.body.adventurePoints.start) {
        adventurePoints = updateStartValue(adventurePoints, params.body.adventurePoints.start);
      }

      if (params.body.adventurePoints.total) {
        adventurePoints = updateTotalValue(adventurePoints, params.body.adventurePoints.total);
      }

      await updateAdventurePoints(params.userId, params.characterId, adventurePoints);
    }

    if (params.body.attributePoints) {
      console.log("Update attribute points");

      if (params.body.attributePoints.start) {
        attributePoints = updateStartValue(attributePoints, params.body.attributePoints.start);
      }

      if (params.body.attributePoints.total) {
        attributePoints = updateTotalValue(attributePoints, params.body.attributePoints.total);
      }

      await updateAttributePoints(params.userId, params.characterId, attributePoints);
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
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
    if (typeof characterId !== "string") {
      throw new HttpError(400, "Invalid input values!");
    }

    validateUUID(characterId);

    const body = bodySchema.parse(request.body);

    return {
      userId: userId,
      characterId: characterId,
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

function updateStartValue(calculationPoints: CalculationPoints, startValue: any): CalculationPoints {
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

function updateTotalValue(calculationPoints: CalculationPoints, totalValue: any): CalculationPoints {
  console.log(
    `Update total calculation points from ${totalValue.initialValue} to ${totalValue.initialValue + totalValue.increasedPoints}`,
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
