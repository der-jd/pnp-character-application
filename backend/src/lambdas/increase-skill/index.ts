import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import { process } from "@types/node";
import { SkillThreshold, CostCategory, costMatrix } from "../../config";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return increaseSkill(event);
};

async function increaseSkill(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const characterId = event.pathParameters?.characterId;
    const skillId = event.pathParameters?.skillId;

    // The conditional parse is necessary for Lambda tests via the AWS console
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    let availableAdventurePoints = verifyParameters(event);

    let skillValue = body.initialValue;
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
      availableAdventurePoints -= increaseCost;
      // TODO add event to history event list --> apply all events in the end when it is clear if there are enough ap
    }

    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#updateItem-property
    const dynamoDb = new DynamoDB({ apiVersion: "2012-08-10" });
    const params = {
      TableName: process.env.TABLE_NAME,
      Key: {
        characterId: {
          N: characterId,
        },
      },
      UpdateExpression:
        `SET characterSheet.calculationPoints.adventurePoints.available = ${availableAdventurePoints}, ` +
        `characterSheet.skills.${skillId}.value = ${skillValue}`,
    };
    dynamoDb.updateItem(params, function (error: any, data: any) {
      if (error) {
        throw {
          statusCode: 500,
          body: JSON.stringify({
            message: "Error when updating DynamoDB item",
            error: (error as Error).message,
          }),
        };
      }

      console.log("Successfully updated DynamoDB item", data.Item);
    });

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
      statusCode: error.statusCode,
      body: error.body
        ? error.body
        : JSON.stringify({
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
 * @returns Available adventure points
 */
function verifyParameters(event: APIGatewayProxyEvent): any {
  const characterId = event.pathParameters?.characterId;
  const skillId = event.pathParameters?.skillId;
  // The conditional parse is necessary for Lambda tests via the AWS console
  const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
  const initialSkillValue = body.initialValue;
  const increasedPoints = body.increasedPoints;
  const costCategory = body.costCategory;

  const uuidRegex = new RegExp("/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i");
  if (!uuidRegex.test(characterId)) {
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Character id is not a valid UUID format!",
      }),
    };
  }
  if (!uuidRegex.test(skillId)) {
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Skill id is not a valid UUID format!",
      }),
    };
  }

  if (
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

  const dynamoDb = new DynamoDB({ apiVersion: "2012-08-10" });
  const params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      characterId: {
        N: characterId,
      },
    },
    ProjectionExpression: "characterSheet",
  };

  const characterSheet = dynamoDb.getItem(params, function (error: any, data: any): any {
    if (error) {
      throw {
        statusCode: 500,
        body: JSON.stringify({
          message: "Error when getting DynamoDB item",
          error: (error as Error).message,
        }),
      };
    }

    console.log("Successfully got DynamoDB item", data.Item);

    if (data.Item.skills[skillId].activated === "false") {
      throw {
        statusCode: 409,
        body: JSON.stringify({
          message: "Skill is not activated yet! Activate it before it can be increased.",
        }),
      };
    }

    if (initialSkillValue !== data.Item.skills[skillId].value) {
      throw {
        statusCode: 409,
        body: JSON.stringify({
          message: "The given skill value doesn't match the value in the backend! Reload the character data.",
        }),
      };
    }

    return data.Item;
  });

  return characterSheet.calculationPoints.adventurePoints.available;
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