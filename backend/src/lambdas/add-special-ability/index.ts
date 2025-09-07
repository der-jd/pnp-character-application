import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  AddSpecialAbilityPathParams,
  AddSpecialAbilityRequest,
  AddSpecialAbilityResponse,
  addSpecialAbilityPathParamsSchema,
  addSpecialAbilityRequestSchema,
  headersSchema,
} from "shared";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  ensureHttpError,
  setSpecialAbilities,
  logZodError,
  isZodError,
} from "utils";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _addSpecialAbility({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: AddSpecialAbilityPathParams;
  body: AddSpecialAbilityRequest;
}

export async function _addSpecialAbility(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(
      `Add special ability '${params.body.specialAbility}' to character ${params.pathParams["character-id"]} of user ${params.userId}`,
    );

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);
    const specialAbilitiesOld = new Set(character.characterSheet.specialAbilities);
    const specialAbilitiesNew = new Set(specialAbilitiesOld);
    specialAbilitiesNew.add(params.body.specialAbility);
    await setSpecialAbilities(params.userId, params.pathParams["character-id"], specialAbilitiesNew);

    const responseBody: AddSpecialAbilityResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      specialAbilityName: params.body.specialAbility,
      specialAbilities: {
        // JSON.stringify() does not work with Set, so we need to convert it to an array
        old: {
          values: Array.from(specialAbilitiesOld),
        },
        new: {
          values: Array.from(specialAbilitiesNew),
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
    throw ensureHttpError(error);
  }
}

function validateRequest(request: Request): Parameters {
  try {
    console.log("Validate request");
    return {
      userId: decodeUserId(headersSchema.parse(request.headers).authorization as string | undefined),
      pathParams: addSpecialAbilityPathParamsSchema.parse(request.pathParameters),
      body: addSpecialAbilityRequestSchema.parse(request.body),
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
