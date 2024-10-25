import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
  // TODO move logic into separate function --> enable unit tests
  try {
    const body = JSON.parse(event.body || "{}");
    const number1 = body.number1;
    const number2 = body.number2;

    if (typeof number1 !== "number" || typeof number2 !== "number") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Error: Please provide two valid numbers!",
        }),
      };
    }

    const sum = number1 + number2;

    return {
      statusCode: 200,
      body: JSON.stringify({ sum }),
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
