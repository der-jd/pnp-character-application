import { APIGatewayProxyResult } from "aws-lambda";
import { add_cors_headers } from "./cors_support.js";

// TODO obsolete?!
export function api_error(error_msg: string, errorcode: number = 500): APIGatewayProxyResult {
  return add_cors_headers({
    statusCode: errorcode,
    body: "Error: " + error_msg,
  });
}
