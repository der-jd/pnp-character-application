import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getAttribute, Attribute } from "config/index.js";
import {
  Request,
  parseBody,
  getCharacterItem,
  updateAttribute,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateCharacterId,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return increaseAttribute({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  characterId: string;
  attributeName: string;
  initialAttributeValue: number;
  increasedPoints: number;
}

export async function increaseAttribute(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.characterId} of user ${params.userId}`);
    console.log(
      `Increase value of attribute '${params.attributeName}' from ${params.initialAttributeValue} to ${params.initialAttributeValue + params.increasedPoints}`,
    );

    const character = await getCharacterItem(params.userId, params.characterId);

    const characterSheet = character.characterSheet;
    const attributePointsOld = characterSheet.calculationPoints.attributePoints;
    const attributePoints = structuredClone(attributePointsOld);
    const attributeOld = getAttribute(characterSheet.attributes, params.attributeName);
    const attribute = structuredClone(attributeOld);

    validatePassedAttributeValues(attribute, params);

    console.log(`Attribute total cost before increasing: ${attribute.totalCost}`);
    console.log(`Available attribute points before increasing: ${attributePoints.available}`);

    if (params.initialAttributeValue + params.increasedPoints === attribute.current) {
      console.log("Attribute value already increased to target value. Nothing to do.");
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
    }

    const increaseCost = 1; // Increase cost are always 1 for attributes
    for (let i = 0; i < params.increasedPoints; i++) {
      console.debug("---------------------------");

      if (increaseCost > attributePoints.available) {
        throw new HttpError(400, "Not enough attribute points to increase the attribute!", {
          characterId: params.characterId,
          attributeName: params.attributeName,
        });
      }

      console.debug(`Attribute value: ${attribute.current}`);
      console.debug(`Attribute total cost: ${attribute.totalCost}`);
      console.debug(`Available attribute points: ${attributePoints.available}`);
      console.debug(`Increasing attribute by 1 for ${increaseCost} attribute point...`);
      attribute.current += 1;
      attribute.totalCost += increaseCost;
      attributePoints.available -= increaseCost;
    }

    await updateAttribute(params.userId, params.characterId, params.attributeName, attribute, attributePoints);

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
  console.log("Validate request");

  const userId = decodeUserId(request.headers.authorization ?? request.headers.Authorization);

  /**
   * This conversion is necessary if the Lambda is called via AWS Step Functions.
   * The input data of a state machine is a string.
   */
  if (typeof request.body?.initialValue === "string") {
    request.body.initialValue = Number(request.body.initialValue);
  }
  if (typeof request.body?.increasedPoints === "string") {
    request.body.increasedPoints = Number(request.body.increasedPoints);
  }

  if (
    typeof request.pathParameters?.["character-id"] !== "string" ||
    typeof request.pathParameters?.["attribute-name"] !== "string" ||
    typeof request.body?.initialValue !== "number" ||
    typeof request.body?.increasedPoints !== "number"
  ) {
    throw new HttpError(400, "Invalid input values!");
  }

  const params: Parameters = {
    userId: userId,
    characterId: request.pathParameters["character-id"],
    attributeName: request.pathParameters["attribute-name"],
    initialAttributeValue: request.body.initialValue,
    increasedPoints: request.body.increasedPoints,
  };

  if (params.increasedPoints <= 0) {
    throw new HttpError(400, "Points to increase are negative! The value must be greater than or equal 1.", {
      increasedPoints: params.increasedPoints,
    });
  }

  validateCharacterId(params.characterId);

  return params;
}

function validatePassedAttributeValues(attribute: Attribute, params: Parameters) {
  console.log("Compare passed attribute values with the values in the backend");

  if (
    params.initialAttributeValue !== attribute.current &&
    params.initialAttributeValue + params.increasedPoints !== attribute.current
  ) {
    throw new HttpError(409, "The passed attribute value doesn't match the value in the backend!", {
      characterId: params.characterId,
      attributeName: params.attributeName,
      passedAttributeValue: params.initialAttributeValue,
      backendAttributeValue: attribute.current,
    });
  }

  console.log("Passed attribute values match the values in the backend");
}
