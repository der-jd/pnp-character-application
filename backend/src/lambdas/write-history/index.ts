import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import jwt, { JwtPayload } from "jsonwebtoken";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getCharacter(event);
};

interface historyBlock {
  characterId: string;
  blockId: string;
  blockNumber: number;
  previousBlockId: string;
  changes: Change[];
}

interface Change {
  id: string;
  event: string;
  name: string;
  data: { [key: string]: any };
  learningMethod: string;
  calculationPoints: {
    adjustment: number;
    old: number;
    new: number;
  };
  date: string; // TODO use timestamp type?!
  comment: string;
}

/**
 *  TODO save history event for all types
 * - Attribute
 * - BaseValue
 * - Skill
 * - CombatSkill
 * - CalculationPoints
 * - Advantages
 * - Disadvantages
 * - Special abilities
 */

interface Parameters {
  userId: string;
  characterId: string;
}

async function getCharacter(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const params = verifyRequest(event);

    const h: historyBlock = {
      characterId: "123",
      blockId: "123",
      blockNumber: 1,
      previousBlockId: "123",
      changes: [],
    };
    console.log(h);

    console.log(`Get character ${params.characterId} of user ${params.userId}`);

    // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);
    const command = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        userId: params.userId,
        characterId: params.characterId,
      },
      ConsistentRead: true,
    });

    const dynamoDbResponse = await docClient.send(command);

    if (!dynamoDbResponse.Item) {
      console.error("Item from DynamoDB table is missing in the request response");
      throw {
        statusCode: 500,
        body: JSON.stringify({
          message: "Item from DynamoDB table is missing in the request response",
        }),
      };
    }

    console.log("Successfully got DynamoDB item");

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        character: dynamoDbResponse.Item,
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

function verifyRequest(event: APIGatewayProxyEvent): Parameters {
  console.log("Verify request");

  // Trim the authorization header as it could contain spaces at the beginning
  const authHeader = event.headers.Authorization?.trim() || event.headers.authorization?.trim();
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

  // The conditional parse is necessary for Lambda tests via the AWS console
  const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  if (
    typeof event.pathParameters?.["character-id"] !== "string" ||
    typeof body?.initialValue !== "number" ||
    typeof body?.increasedPoints !== "number" ||
    typeof body?.learningMethod !== "string"
  ) {
    console.error("Invalid input values!");
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid input values!",
      }),
    };
  }

  const characterId = event.pathParameters?.["character-id"];

  const uuidRegex = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$");
  if (!uuidRegex.test(characterId)) {
    console.error("Character id is not a valid UUID format!");
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Character id is not a valid UUID format!",
      }),
    };
  }

  return {
    userId: userId,
    characterId: characterId,
  };
}
