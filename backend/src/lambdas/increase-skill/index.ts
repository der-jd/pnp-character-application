import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { CostCategory, Character, getIncreaseCost, getSkill } from "config/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return increaseSkill(event);
};

interface Parameters {
  characterId: string;
  skillCategory: string;
  skillName: string;
  initialSkillValue: number;
  increasedPoints: number;
  costCategory: string;
}

async function increaseSkill(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const params = verifyParameters(event);

    console.log(`Update character ${params.characterId}`);
    console.log(
      `Increase value of skill '${params.skillName}' from ${params.initialSkillValue} to ${params.initialSkillValue + params.increasedPoints} by cost category '${params.costCategory}'`,
    );

    const character = await getCharacterItem(params);

    const characterSheet = character.characterSheet;
    let availableAdventurePoints = characterSheet.calculationPoints.adventurePoints.available;
    const skillCategory = params.skillCategory as keyof Character["characterSheet"]["skills"];
    let skillValue = getSkill(characterSheet.skills, skillCategory, params.skillName).current;
    let totalCost = getSkill(characterSheet.skills, skillCategory, params.skillName).totalCost;
    const costCategory = CostCategory.parse(params.costCategory);

    if (params.initialSkillValue + params.increasedPoints === skillValue) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Skill already increased to target value. Nothing to do!",
          characterId: params.characterId,
          skillName: params.skillName,
          skillValue: skillValue,
          totalCost: totalCost,
          availableAdventurePoints: availableAdventurePoints,
        }),
      };
    }

    for (let i = 0; i < params.increasedPoints; i++) {
      console.debug("---------------------------");
      const increaseCost = getIncreaseCost(skillValue, costCategory);

      if (increaseCost > availableAdventurePoints) {
        return {
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
      // TODO add event to history event list --> apply all events in the end when it is clear if there are enough ap
    }

    // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);
    const command = new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        characterId: params.characterId,
      },
      UpdateExpression:
        "SET #characterSheet.#skills.#skillCategory.#skillName.#current = :current, " +
        "#characterSheet.#skills.#skillCategory.#skillName.#totalCost = :totalCost, " +
        "#characterSheet.#calculationPoints.#adventurePoints.#available = :available",
      ExpressionAttributeNames: {
        "#characterSheet": "characterSheet",
        "#skills": "skills",
        "#skillCategory": skillCategory,
        "#skillName": params.skillName,
        "#current": "current",
        "#totalCost": "totalCost",
        "#calculationPoints": "calculationPoints",
        "#adventurePoints": "adventurePoints",
        "#available": "available",
      },
      ExpressionAttributeValues: {
        ":current": skillValue,
        ":totalCost": totalCost,
        ":available": availableAdventurePoints,
      },
    });
    await docClient.send(command);
    console.log("Successfully updated DynamoDB item");

    // TODO save event in history
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Successfully increased skill",
        characterId: params.characterId,
        skillName: params.skillName,
        skillValue: skillValue,
        totalCost: totalCost,
        availableAdventurePoints: availableAdventurePoints,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: error.statusCode ?? 500,
      body:
        error.body ??
        JSON.stringify({
          message: "An error occurred!",
          error: (error as Error).message,
        }),
    };
  }
}

function verifyParameters(event: APIGatewayProxyEvent): Parameters {
  console.log("Verify request parameters");

  // The conditional parse is necessary for Lambda tests via the AWS console
  const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  if (
    typeof event.pathParameters?.characterId !== "string" ||
    typeof event.pathParameters?.skillCategory !== "string" ||
    typeof event.pathParameters?.skillName !== "string" ||
    typeof body?.initialValue !== "number" ||
    typeof body?.increasedPoints !== "number" ||
    typeof body?.costCategory !== "string"
  ) {
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid input values!",
      }),
    };
  }

  const params: Parameters = {
    characterId: event.pathParameters.characterId,
    skillCategory: event.pathParameters.skillCategory,
    skillName: event.pathParameters.skillName,
    initialSkillValue: body.initialValue,
    increasedPoints: body.increasedPoints,
    costCategory: body.costCategory,
  };

  if (params.increasedPoints <= 0) {
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: `Points to increase are ${params.increasedPoints}! The value must be greater than or equal 1.`,
      }),
    };
  }

  const uuidRegex = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$");
  if (!uuidRegex.test(params.characterId)) {
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Character id is not a valid UUID format!",
      }),
    };
  }

  return params;
}

async function getCharacterItem(params: Parameters): Promise<Character> {
  console.log("Get Character from DynamoDB");

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      characterId: params.characterId,
    },
  });

  const response = await docClient.send(command);

  if (!response.Item) {
    throw {
      statusCode: 500,
      body: JSON.stringify({
        message: "Item from DynamoDB table is missing in the request response",
      }),
    };
  }

  console.log("Successfully got DynamoDB item");

  const skill = response.Item.characterSheet.skills[params.skillCategory][params.skillName];

  if (skill.activated === "false") {
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

  return response.Item as Character;
}
