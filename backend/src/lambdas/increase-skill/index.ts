import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SkillThreshold, CostCategory, costMatrix, Character, CharacterSheet } from "config/index.mjs";

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
    let skillValue = CharacterSheet.getSkill(characterSheet.skills, skillCategory, skillName).current;
    let totalCost = CharacterSheet.getSkill(characterSheet.skills, skillCategory, skillName).totalCost;

    // The conditional parse is necessary for Lambda tests via the AWS console
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const costCategory = CostCategory.parse(body.costCategory);

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
        characterId: characterId,
      },
      UpdateExpression:
        `set characterSheet.calculationPoints.adventurePoints.available = ${availableAdventurePoints}, ` +
        `characterSheet.skills.${skillCategory}.${skillName}.current = ${skillValue}, ` +
        `characterSheet.skills.${skillCategory}.${skillName}.totalCost = ${totalCost}`,
    });
    const response = await docClient.send(command);
    console.log("Successfully updated DynamoDB item");
    console.log(response);

    // TODO save event in history
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Successfully increased skill",
        skillValue: skillValue,
        increaseCost: getIncreaseCost(skillValue, costCategory),
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

/**
 * All necessary values for the calculation are taken from the backend as single source of truth.
 * Otherwise, unsynchronized or manipulated frontend values could disrupt the backend data.
 *
 * @returns object for the character item in the DynamoDB table
 */
async function verifyParameters(event: APIGatewayProxyEvent): Promise<Character> {
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

  const uuidRegex = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$");
  if (!uuidRegex.test(characterId)) {
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Character id is not a valid UUID format!",
      }),
    };
  }

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

    console.log("Successfully got DynamoDB item");

    if (response.Item?.skills.$skillCategory.$skillName.activated === "false") {
      throw {
        statusCode: 409,
        body: JSON.stringify({
          message: "Skill is not activated yet! Activate it before it can be increased.",
        }),
      };
    }

    if (initialSkillValue !== response.Item?.skills.$skillCategory.$skillName.current) {
      console.warn(
        "The given skill value doesn't match the value in the backend! Continue calculation with the backend value anyway.",
      );
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

function getIncreaseCost(skillValue: number, costCategory: CostCategory): number {
  let column: number;
  if (skillValue < SkillThreshold._1) {
    column = SkillThreshold._1;
  } else if (skillValue < SkillThreshold._2) {
    column = SkillThreshold._2;
  } else {
    column = SkillThreshold._3;
  }

  return costMatrix[costCategory][column];
}
