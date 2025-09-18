import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  Request,
  parseBody,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  createCharacterItem,
  isZodError,
  logZodError,
} from "core";
import { CharacterBuilder } from "core";
import { CreateCharacterResponse, headersSchema, PostCharactersRequest, postCharactersRequestSchema } from "api-spec";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return _createCharacter({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  body: PostCharactersRequest;
}

export async function _createCharacter(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Create new character for user ${params.userId}`);

    const characterCreation = new CharacterBuilder()
      .setUserId(params.userId)
      .setGeneralInformation(params.body.generalInformation)
      .setDisAdvantages(params.body.advantages, params.body.disadvantages)
      .setAttributes(params.body.attributes)
      .activateSkills(params.body.activatedSkills)
      .setCombatSkillsStartValues(params.body.combatSkillsStartValues)
      .build();

    await createCharacterItem(characterCreation.character);

    const responseBody: CreateCharacterResponse = {
      characterId: characterCreation.character.characterId,
      userId: characterCreation.character.userId,
      characterName: characterCreation.character.characterSheet.generalInformation.name,
      changes: {
        new: {
          character: characterCreation.character,
          generationPoints: characterCreation.generationPoints,
          activatedSkills: characterCreation.activatedSkills,
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
      body: postCharactersRequestSchema.parse(request.body),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }
    throw error;
  }
}
