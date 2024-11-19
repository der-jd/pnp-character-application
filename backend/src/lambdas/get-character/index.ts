import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return getCharacter(event);
};

async function getCharacter(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const client = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(client);
    const characterId = event.pathParameters?.characterId;

    /**
     * TODO implement function
     * https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/javascriptv3/example_code/dynamodb/actions/document-client/get.js
     * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Interface/GetItemCommandInput/
     * https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/GetCommand/
     * https://aws.amazon.com/blogs/developer/announcing-the-amazon-dynamodb-document-client-in-the-aws-sdk-for-javascript/
     */

    const command = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        characterId: characterId,
      },
    });

    const response = await docClient.send(command);
    console.log(response);

    return {
      statusCode: 200,
      body: JSON.stringify("Success"),
      /**
       * return
       * - success message
       * - new skill value
       * - new cost category
       * - new cost/point
       * - new adventure points
       */
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
