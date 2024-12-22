//import { CostCategory, Character, getIncreaseCost, getSkill } from "config/index.js";
// TODO need function when user changes the cost category in frontend and the web Ui needs to show the new cost#
// TODO allow input of multiple values so that cost for multiple things can be returned (use in case of initial character loading)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CostCategory, Character, getIncreaseCost, getSkill } from "config/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getSkillCost(event);
};

interface Parameters {
  characterId: string;
  skillCategory: string;
  skillName: string;
  costCategory: string;
}

async function getSkillCost(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const params = verifyParameters(event);

    console.log(
      `Get cost for skill '${params.skillName}' (cost category '${params.costCategory}') of character ${params.characterId}`,
    );

    const character = await getCharacterItem(params);

    const characterSheet = character.characterSheet;
    const skillCategory = params.skillCategory as keyof Character["characterSheet"]["skills"];
    const skillValue = getSkill(characterSheet.skills, skillCategory, params.skillName).current;
    /**
     * TODO add check if the cost category is reasonable for the skill.
     * I.e. compare the default cost category of the skill with the given category.
     * The category must equal -1/+0/+1 of default or be zero (free increase)
     */
    const costCategory = CostCategory.parse(params.costCategory);
    const increaseCost = getIncreaseCost(skillValue, costCategory);

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: "Successfully got skill cost",
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

function verifyParameters(event: APIGatewayProxyEvent): Parameters {
  console.log("Verify request parameters");

  if (
    typeof event.pathParameters?.characterId !== "string" ||
    typeof event.pathParameters?.skillCategory !== "string" ||
    typeof event.pathParameters?.skillName !== "string" ||
    typeof event.queryStringParameters?.costCategory !== "string"
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
    characterId: event.pathParameters.characterId,
    skillCategory: event.pathParameters.skillCategory,
    skillName: event.pathParameters.skillName,
    costCategory: event.queryStringParameters.costCategory,
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
    console.error("Item from DynamoDB table is missing in the request response");
    throw {
      statusCode: 500,
      body: JSON.stringify({
        message: "Item from DynamoDB table is missing in the request response",
      }),
    };
  }

  console.log("Successfully got DynamoDB item");

  return response.Item as Character;
}
