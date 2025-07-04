import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  validateUUID,
  setSpecialAbilities,
} from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _addSpecialAbility({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

const bodySchema = z
  .object({
    specialAbility: z.string().max(100),
  })
  .strict();

interface Parameters {
  userId: string;
  characterId: string;
  specialAbility: string;
}

export async function _addSpecialAbility(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(
      `Add special ability '${params.specialAbility}' to character ${params.characterId} of user ${params.userId}`,
    );

    const character = await getCharacterItem(params.userId, params.characterId);
    const specialAbilitiesOld = new Set(character.characterSheet.specialAbilities);
    const specialAbilitiesNew = new Set(specialAbilitiesOld);
    specialAbilitiesNew.add(params.specialAbility);
    await setSpecialAbilities(params.userId, params.characterId, specialAbilitiesNew);

    const response = {
      statusCode: 200,
      // JSON.stringify() does not work with Set, so we need to convert it to an array
      body: JSON.stringify(
        {
          characterId: params.characterId,
          userId: params.userId,
          specialAbilityName: params.specialAbility,
          specialAbilities: {
            old: {
              values: specialAbilitiesOld,
            },
            new: {
              values: specialAbilitiesNew,
            },
          },
        },
        (key, value) => {
          if (value instanceof Set) {
            return Array.from(value);
          }
          return value;
        },
      ),
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

  const characterId = request.pathParameters?.["character-id"];
  if (typeof characterId !== "string") {
    throw new HttpError(400, "Invalid input values!");
  }

  validateUUID(characterId);

  try {
    const body = bodySchema.parse(request.body);

    return {
      userId: userId,
      characterId: characterId,
      specialAbility: body.specialAbility,
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
