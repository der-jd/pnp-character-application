import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LearningMethod, CostCategory, Character, getSkillIncreaseCost, getSkill } from "config/index.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, parseBody, getCharacterItem } from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getSkillCost({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  characterId: string;
  skillCategory: string;
  skillName: string;
  learningMethod: string;
}

export async function getSkillCost(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(
      `Get increase cost for skill '${params.skillCategory}/${params.skillName}' (learning method '${params.learningMethod}') of character ${params.characterId} of user ${params.userId}`,
    );

    const character = await getCharacterItem(params.userId, params.characterId);

    const characterSheet = character.characterSheet;
    const skillCategory = params.skillCategory as keyof Character["characterSheet"]["skills"];
    const defaultCostCategory = getSkill(characterSheet.skills, skillCategory, params.skillName).defaultCostCategory;
    const adjustedCostCategory = CostCategory.adjustCategory(
      defaultCostCategory,
      LearningMethod.parse(params.learningMethod),
    );
    const skillValue = getSkill(characterSheet.skills, skillCategory, params.skillName).current;

    console.log(`Default cost category: ${defaultCostCategory}`);
    console.log(`Adjusted cost category: ${adjustedCostCategory}`);

    const increaseCost = getSkillIncreaseCost(skillValue, adjustedCostCategory);

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        skillName: params.skillName,
        increaseCost: increaseCost,
      }),
    };
    console.log(response);
    return response;
  } catch (error: any) {
    const response = {
      statusCode: error.statusCode ?? 500,
      body:
        error.body ??
        JSON.stringify({
          message: "An error occurred!",
          error: (error as Error).message,
        }),
    };
    console.error(response);

    return response;
  }
}

function validateRequest(request: Request): Parameters {
  console.log("Validate request");

  // Trim the authorization header as it could contain spaces at the beginning
  const authHeader = request.headers.Authorization?.trim() || request.headers.authorization?.trim();
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized: No token provided!" }),
    };
  }

  const token = authHeader.split(" ")[1]; // Remove "Bearer " prefix
  // Decode the token without verification (the access to the API itself is already protected by the authorizer)
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded) {
    throw {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized: Invalid token!" }),
    };
  }

  const userId = decoded.sub; // Cognito User ID
  if (!userId) {
    throw {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized: User ID not found in token!" }),
    };
  }

  if (
    typeof request.pathParameters?.["character-id"] !== "string" ||
    typeof request.pathParameters?.["skill-category"] !== "string" ||
    typeof request.pathParameters?.["skill-name"] !== "string" ||
    typeof request.queryStringParameters?.["learning-method"] !== "string"
  ) {
    console.error("Invalid input values!");
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid input values!",
      }),
    };
  }

  const params: Parameters = {
    userId: userId,
    characterId: request.pathParameters["character-id"],
    skillCategory: request.pathParameters["skill-category"],
    skillName: request.pathParameters["skill-name"],
    learningMethod: request.queryStringParameters["learning-method"],
  };

  const uuidRegex = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$");
  if (!uuidRegex.test(params.characterId)) {
    console.error("Character id is not a valid UUID format!");
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Character id is not a valid UUID format!",
      }),
    };
  }

  return params;
}
