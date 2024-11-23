import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { CostCategory, Character, getIncreaseCost, getSkill } from "config/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return increaseSkill(event);
};

async function increaseSkill(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const character = await verifyParameters(event);

    const characterId = character.characterId;
    const characterSheet = character.characterSheet;
    let availableAdventurePoints = characterSheet.calculationPoints.adventurePoints.available;
    const skillCategory = event.pathParameters?.skillCategory as keyof Character["characterSheet"]["skills"];
    const skillName = event.pathParameters?.skillName as string;
    /**
     * The skill value is taken from the backend as single source of truth, although,
     * at this place it has already been checked that the backend and frontend values match.
     */
    let skillValue = getSkill(characterSheet.skills, skillCategory, skillName).current;
    let totalCost = getSkill(characterSheet.skills, skillCategory, skillName).totalCost;
    // The conditional parse is necessary for Lambda tests via the AWS console
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const costCategory = CostCategory.parse(body.costCategory);

    console.info(`Update character ${characterId} with name ${characterSheet.generalInformation.name}`);
    console.info(
      `Increase value of skill '${skillName}' from ${body.initialValue} to ${body.initialValue + body.increasedPoints} by cost category '${body.costCategory}'`,
    );

    if (body.initialValue + body.increasedPoints === skillValue) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Skill already increased to target value. Nothing to do!",
          characterId: characterId,
          skillName: skillName,
          skillValue: skillValue,
          totalCost: totalCost,
          availableAdventurePoints: availableAdventurePoints,
        }),
      };
    }

    for (let i = 0; i < body.increasedPoints; i++) {
      const increaseCost = getIncreaseCost(skillValue, costCategory);

      if (increaseCost > availableAdventurePoints) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "Not enough adventure points to increase the skill!",
          }),
        };
      }

      console.log(`Increasing skill by 1 for ${increaseCost} adventure points...`);
      skillValue += 1;
      totalCost += increaseCost;
      availableAdventurePoints -= increaseCost;
      console.log(`Skill value: ${skillValue}`);
      console.log(`Skill total cost: ${totalCost}`);
      console.log(`Available adventure points: ${availableAdventurePoints}`);
      // TODO add event to history event list --> apply all events in the end when it is clear if there are enough ap
    }

    // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/update.js
    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);
    const command = new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        characterId: characterId,
      },
      UpdateExpression:
        "SET #adventurePointsAvailable = :available, " +
        "#currentSkillValue = :current, " +
        "#skillTotalCost = :totalCost",
      ExpressionAttributeNames: {
        "#adventurePointsAvailable": "characterSheet.calculationPoints.adventurePoints.available",
        "#currentSkillValue": `characterSheet.skills.${skillCategory}.${skillName}.current`,
        "#skillTotalCost": `characterSheet.skills.${skillCategory}.${skillName}.totalCost`,
      },
      ExpressionAttributeValues: {
        ":available": availableAdventurePoints,
        ":current": skillValue,
        ":totalCost": totalCost,
      },
    });
    await docClient.send(command);
    console.info("Successfully updated DynamoDB item");

    // TODO save event in history
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Successfully increased skill",
        characterId: characterId,
        skillName: skillName,
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

async function verifyParameters(event: APIGatewayProxyEvent): Promise<Character> {
  console.info("Verifying request's parameters...");

  const characterId = event.pathParameters?.characterId;
  const skillCategory = event.pathParameters?.skillCategory;
  const skillName = event.pathParameters?.skillName;
  // The conditional parse is necessary for Lambda tests via the AWS console
  const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
  const initialSkillValue = body.initialValue;
  const increasedPoints = body.increasedPoints;
  const costCategory = body.costCategory;

  if (
    typeof characterId !== "string" ||
    typeof skillCategory !== "string" ||
    typeof skillName !== "string" ||
    typeof initialSkillValue !== "number" ||
    typeof increasedPoints !== "number" ||
    typeof costCategory !== "string"
  ) {
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid input values!",
      }),
    };
  }

  if (increasedPoints <= 0) {
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Points to increase are 0 or negative! The value must be greater than or equal 1.",
      }),
    };
  }

  const uuidRegex = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$");
  if (!uuidRegex.test(characterId)) {
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Character id is not a valid UUID format!",
      }),
    };
  }

  // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      characterId: characterId,
    },
  });

  try {
    const response = await docClient.send(command);

    if (!response.Item) {
      throw {
        statusCode: 500,
        body: JSON.stringify({
          message: "Item from DynamoDB table is missing in the request's response",
        }),
      };
    }

    console.info("Successfully got DynamoDB item");
    const skill = response.Item.characterSheet.skills[skillCategory][skillName];

    if (skill.activated === "false") {
      throw {
        statusCode: 409,
        body: JSON.stringify({
          message: "Skill is not activated yet! Activate it before it can be increased.",
        }),
      };
    }

    if (initialSkillValue !== skill.current && initialSkillValue + increasedPoints !== skill.current) {
      throw {
        statusCode: 409,
        body: JSON.stringify({
          message: "The passed skill value doesn't match the value in the backend!",
        }),
      };
    }

    return response.Item as Character;
  } catch (error: any) {
    throw {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error when getting DynamoDB item.",
        error: (error as Error).message,
      }),
    };
  }
}
