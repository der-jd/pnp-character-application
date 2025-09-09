import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  PostSpecialAbilitiesPathParams,
  PostSpecialAbilitiesRequest,
  AddSpecialAbilityResponse,
  postSpecialAbilitiesPathParamsSchema,
  postSpecialAbilitiesRequestSchema,
  headersSchema,
} from "api-spec";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
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
  pathParams: PostSpecialAbilitiesPathParams;
  body: PostSpecialAbilitiesRequest;
}

export async function _addSpecialAbility(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(
      `Add special ability '${params.body.specialAbility}' to character ${params.pathParams["character-id"]} of user ${params.userId}`,
    );

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);
    const specialAbilitiesOld = character.characterSheet.specialAbilities;
    const specialAbilitiesNew = [...specialAbilitiesOld];
    if (!specialAbilitiesNew.includes(params.body.specialAbility)) {
      specialAbilitiesNew.push(params.body.specialAbility);
    }
    await setSpecialAbilities(params.userId, params.pathParams["character-id"], specialAbilitiesNew);

    const responseBody: AddSpecialAbilityResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      specialAbilityName: params.body.specialAbility,
      specialAbilities: {
        old: {
          values: specialAbilitiesOld,
        },
        new: {
          values: specialAbilitiesNew,
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
      pathParams: postSpecialAbilitiesPathParamsSchema.parse(request.pathParameters),
      body: postSpecialAbilitiesRequestSchema.parse(request.body),
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
