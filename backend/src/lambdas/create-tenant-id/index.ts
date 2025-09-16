import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // TODO: Implement tenant creation logic
  return {
    statusCode: 501,
    body: JSON.stringify({ message: "Not implemented" }),
  };
};
