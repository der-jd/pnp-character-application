import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
  // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    return {
      statusCode: 200,
      body: JSON.stringify("Hello world from Lambda!"),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "An error occurred",
        error: (error as Error).message,
      }),
    };
  }
};
