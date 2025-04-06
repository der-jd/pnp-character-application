import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, parseBody } from "config/index.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getCharacters({
    headers: event.headers,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters,
    body: parseBody(event.body),
  });
};

interface Parameters {
  userId: string;
  characterShort: boolean;
}

export async function getCharacters(request: Request): Promise<APIGatewayProxyResult> {
  try {
    const params = validateRequest(request);

    console.log(`Get characters for user ${params.userId}`);

    // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/query.js
    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);
    const command = new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": params.userId,
      },
      ConsistentRead: true,
    });

    const dynamoDbResponse = await docClient.send(command);

    if (!dynamoDbResponse.Items || dynamoDbResponse.Items.length === 0) {
      console.error("No characters found for the given user id");
      throw {
        statusCode: 404,
        body: JSON.stringify({
          message: "No characters found for the given user id",
        }),
      };
    }

    console.log("Successfully got DynamoDB items");

    let characters = [];
    if (params.characterShort) {
      for (const item of dynamoDbResponse.Items) {
        characters.push({
          userId: item.userId,
          characterId: item.characterId,
          name: item.characterSheet.generalInformation.name,
          level: item.characterSheet.generalInformation.level,
        });
      }
    } else {
      characters = dynamoDbResponse.Items;
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        characters: characters,
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

  // TODO move handling of authorization token to Lambda layer
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
    request.queryStringParameters?.["character-short"] &&
    typeof request.queryStringParameters?.["character-short"] !== "string"
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
    characterShort: request.queryStringParameters?.["character-short"] === "true",
  };

  return params;
}
