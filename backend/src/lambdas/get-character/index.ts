import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getCharacter(event);
};

// TODO update API to include user id --> .../{userId}/character/{characterId}
// TODO also add API to get all characters for a user .../{userId}/characters
async function getCharacter(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const characterId = verifyParameters(event);

    console.log(`Get character ${characterId} from DynamoDB`);

    // https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);
    const command = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        characterId: characterId,
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
        message: "Successfully got character",
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

function verifyParameters(event: APIGatewayProxyEvent): string {
  console.log("Verify request parameters");

  if (typeof event.pathParameters?.characterId !== "string") {
    console.error("Invalid input values!");
    throw {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid input values!",
      }),
    };
  }

  const characterId = event.pathParameters?.characterId;

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

  return characterId;
}
