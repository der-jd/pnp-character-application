import jwt, { JwtPayload } from "jsonwebtoken";
import { HttpError } from "./errors.js";

/**
 * Decodes the user ID from the authorization header.
 *
 * NOTICE:
 * The access to the API itself is already protected by
 * the Cognito authorizer in the API Gateway.
 * Therefore, this function does not verify the token.
 * It should actually never throw an error,
 * unless the code is called directly from within the AWS environment,
 * e.g. by calling the Lambda function directly.
 *
 * @param authorizationHeader The authorization header.
 * @returns The user ID.
 */
export function decodeUserId(authorizationHeader: string | undefined): string {
  // Trim the authorization header as it could contain spaces at the beginning
  const authHeader = authorizationHeader?.trim();

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("No authorization token provided!");
    throw new HttpError(401, "Unauthorized");
  }

  const token = authHeader.split(" ")[1]; // Remove "Bearer " prefix
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded) {
    console.error("Invalid authorization token!");
    throw new HttpError(401, "Unauthorized");
  }

  const userId = decoded.sub; // Cognito User ID
  if (!userId) {
    console.error("User ID not found in authorization token!");
    throw new HttpError(401, "Unauthorized");
  }

  return userId;
}
