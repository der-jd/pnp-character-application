import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  patchGeneralInformationPathParamsSchema,
  PatchGeneralInformationPathParams,
  patchGeneralInformationRequestSchema,
  PatchGeneralInformationRequest,
  UpdateGeneralInformationResponse,
  headersSchema,
  GeneralInformation,
} from "api-spec";
import {
  Request,
  parseBody,
  getCharacterItem,
  decodeUserId,
  HttpError,
  logAndEnsureHttpError,
  updateGeneralInformation,
  isZodError,
  logZodError,
  updateRulesetVersion,
  getVersionUpdate,
  createLogger,
  sanitizeEvent,
} from "core";

const logger = createLogger("update-general-information");

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info(sanitizeEvent(event), "Incoming request");

  return _updateGeneralInformation({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  pathParams: PatchGeneralInformationPathParams;
  body: PatchGeneralInformationRequest;
}

export async function _updateGeneralInformation(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.pathParams["character-id"]} of user ${params.userId}`);
    console.log("Update general information");

    const character = await getCharacterItem(params.userId, params.pathParams["character-id"]);

    const versionUpdate = getVersionUpdate(character.rulesetVersion);
    if (versionUpdate) {
      await updateRulesetVersion(params.userId, params.pathParams["character-id"], versionUpdate.new.value);
    }

    const generalInformationOld = character.characterSheet.generalInformation;
    const generalInformationNew: GeneralInformation = {
      ...generalInformationOld,
      ...params.body,
    };

    if (JSON.stringify(generalInformationOld) !== JSON.stringify(generalInformationNew)) {
      await updateGeneralInformation(params.userId, params.pathParams["character-id"], generalInformationNew);
    } else {
      console.log("No changes detected, skipping DynamoDB write");
    }

    const responseBody: UpdateGeneralInformationResponse = {
      characterId: params.pathParams["character-id"],
      userId: params.userId,
      changes: {
        old: { generalInformation: generalInformationOld },
        new: { generalInformation: generalInformationNew },
      },
      versionUpdate,
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
      pathParams: patchGeneralInformationPathParamsSchema.parse(request.pathParameters),
      body: patchGeneralInformationRequestSchema.parse(request.body),
    };
  } catch (error) {
    if (isZodError(error)) {
      logZodError(error);
      throw new HttpError(400, "Invalid input values!");
    }

    throw error;
  }
}
