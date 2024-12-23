import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LearningMethod, CostCategory, Character, getSkillIncreaseCost, getSkill } from "config/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getSkillCost(event);
};

interface Parameters {
  characterId: string;
  skillCategory: string;
  skillName: string;
  learningMethod: string;
}

async function getSkillCost(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const params = verifyParameters(event);

    console.log(
      `Get increase cost for skill '${params.skillName}' (learning method '${params.learningMethod}') of character ${params.characterId}`,
    );

    const character = await getCharacterItem(params);

    const characterSheet = character.characterSheet;
    const skillCategory = params.skillCategory as keyof Character["characterSheet"]["skills"];
    const defaultCostCategory = getSkill(characterSheet.skills, skillCategory, params.skillName).defaultCostCategory;
    const adjustedCostCategory = CostCategory.adjustCategory(
      CostCategory.parse(defaultCostCategory.toString()), // Without parse CostCategory is interpreted as string and not as a number
      LearningMethod.parse(params.learningMethod),
    );
    const skillValue = getSkill(characterSheet.skills, skillCategory, params.skillName).current;

    console.log(`Default cost category: ${defaultCostCategory}`);
    console.log(`Adjusted cost category: ${adjustedCostCategory}`);

    const increaseCost = getSkillIncreaseCost(skillValue, adjustedCostCategory);

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
    typeof event.queryStringParameters?.learningMethod !== "string"
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
    learningMethod: event.queryStringParameters.learningMethod,
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
