import { APIGatewayProxyResult } from "aws-lambda";

/*
 * This function extends the reply in such a way that satisfies CORS requirements for replies
 * from the API Gateway. For further information see:
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
 * Section "Enabling CORS support for proxy integrations"
 *
 * For a Lambda proxy integration or HTTP proxy integration, your backend is responsible
 * for returning the Access-Control-Allow-Origin, Access-Control-Allow-Methods, and
 * Access-Control-Allow-Headers headers, because a proxy integration doesn't return an
 * integration response.
 **/

// TODO: Allow-Headers and Allow-Methods must be adjusted to match exactly what the application uses
export function add_cors_headers(reply: APIGatewayProxyResult): APIGatewayProxyResult {
  const cors_headers = {
    "Access-Control-Allow-Headers":
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token, RefreshToken",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET, PUT, PATCH",
  };

  reply.headers = {
    ...(reply.headers || {}),
    ...cors_headers,
  };

  return reply;
}
