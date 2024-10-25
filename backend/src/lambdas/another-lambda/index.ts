import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
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
