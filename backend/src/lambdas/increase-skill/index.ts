import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import jwt, { JwtPayload } from "jsonwebtoken";
import { LearningMethod, adjustCostCategory, Character, getSkillIncreaseCost, getSkill } from "config/index.js";
import { Request, parseBody, getCharacterItem, updateSkill } from "utils/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return increaseSkill({
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
  initialSkillValue: number;
  increasedPoints: number;
  learningMethod: string;
}

export async function increaseSkill(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Update character ${params.characterId} of user ${params.userId}`);
    console.log(
      `Increase value of skill '${params.skillCategory}/${params.skillName}' from ${params.initialSkillValue} to ${params.initialSkillValue + params.increasedPoints} by learning method '${params.learningMethod}'`,
    );

    const character = await getCharacterItem(params.userId, params.characterId);
    validatePassedSkillValues(character, params);

    const characterSheet = character.characterSheet;
    let availableAdventurePoints = characterSheet.calculationPoints.adventurePoints.available;
    const skillCategory = params.skillCategory as keyof Character["characterSheet"]["skills"];
    const defaultCostCategory = getSkill(characterSheet.skills, skillCategory, params.skillName).defaultCostCategory;
    let skillValue = getSkill(characterSheet.skills, skillCategory, params.skillName).current;
    let totalCost = getSkill(characterSheet.skills, skillCategory, params.skillName).totalCost;
    const adjustedCostCategory = adjustCostCategory(defaultCostCategory, LearningMethod.parse(params.learningMethod));

    console.log(`Default cost category: ${defaultCostCategory}`);
    console.log(`Adjusted cost category: ${adjustedCostCategory}`);
    console.log(`Skill total cost before increasing: ${totalCost}`);
    console.log(`Available adventure points before increasing: ${availableAdventurePoints}`);

    if (params.initialSkillValue + params.increasedPoints === skillValue) {
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          characterId: params.characterId,
          skillName: params.skillName,
          skillValue: skillValue,
          totalCost: totalCost,
          availableAdventurePoints: availableAdventurePoints,
        }),
      };
      console.log(response);

      return response;
    }

    for (let i = 0; i < params.increasedPoints; i++) {
      console.debug("---------------------------");
      const increaseCost = getSkillIncreaseCost(skillValue, adjustedCostCategory);

      if (increaseCost > availableAdventurePoints) {
        console.error("Not enough adventure points to increase the skill!");
        throw {
          statusCode: 400,
          body: JSON.stringify({
            message: "Not enough adventure points to increase the skill!",
            characterId: params.characterId,
            skillName: params.skillName,
          }),
        };
      }

      console.debug(`Skill value: ${skillValue}`);
      console.debug(`Skill total cost: ${totalCost}`);
      console.debug(`Available adventure points: ${availableAdventurePoints}`);
      console.debug(`Increasing skill by 1 for ${increaseCost} AP...`);
      skillValue += 1;
      totalCost += increaseCost;
      availableAdventurePoints -= increaseCost;
      // TODO add record to history --> apply all records in the end when it is clear if there are enough ap
    }

    await updateSkill(
      params.userId,
      params.characterId,
      skillCategory,
      params.skillName,
      skillValue,
      totalCost,
      availableAdventurePoints,
    );

    // TODO save record in history
    /** TODO check latency for increase skill
     *  If latency high: return cost for next skill point for given cost category
     *  If latency low: let frontend call separate Lambda for cost for given skill value and cost category
     */
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characterId: params.characterId,
        skillName: params.skillName,
        skillValue: skillValue,
        totalCost: totalCost,
        availableAdventurePoints: availableAdventurePoints,
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
    typeof request.body?.initialValue !== "number" ||
    typeof request.body?.increasedPoints !== "number" ||
    typeof request.body?.learningMethod !== "string"
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
    initialSkillValue: request.body.initialValue,
    increasedPoints: request.body.increasedPoints,
    learningMethod: request.body.learningMethod,
  };

  if (params.increasedPoints <= 0) {
    console.error(`Points to increase are ${params.increasedPoints}! The value must be greater than or equal 1.`);
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: `Points to increase are ${params.increasedPoints}! The value must be greater than or equal 1.`,
      }),
    };
  }

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

function validatePassedSkillValues(char: Character, params: Parameters) {
  console.log("Compare passed skill values with the values in the backend");

  const skill = char.characterSheet.skills[params.skillCategory][params.skillName];

  if (!skill.activated) {
    console.error("Skill is not activated yet! Activate it before it can be increased.");
    throw {
      statusCode: 409,
      body: JSON.stringify({
        message: "Skill is not activated yet! Activate it before it can be increased.",
        characterId: params.characterId,
        skillName: params.skillName,
      }),
    };
  }

  if (
    params.initialSkillValue !== skill.current &&
    params.initialSkillValue + params.increasedPoints !== skill.current
  ) {
    console.error("The passed skill value doesn't match the value in the backend!");
    throw {
      statusCode: 409,
      body: JSON.stringify({
        message: "The passed skill value doesn't match the value in the backend!",
        characterId: params.characterId,
        skillName: params.skillName,
        passedSkillValue: params.initialSkillValue,
        backendSkillValue: skill.current,
      }),
    };
  }

  console.log("Passed skill values match the values in the backend");
}
