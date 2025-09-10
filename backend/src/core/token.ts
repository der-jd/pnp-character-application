import jwt, { JwtPayload } from "jsonwebtoken";
import { HttpError } from "./errors.js";

export function decodeUserId(authorizationHeader: string | undefined): string {
  // Trim the authorization header as it could contain spaces at the beginning
  const authHeader = authorizationHeader?.trim();
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "Unauthorized: No token provided!");
  }

  const token = authHeader.split(" ")[1]; // Remove "Bearer " prefix
  // Decode the token without verification (the access to the API itself is already protected by the authorizer)
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded) {
    throw new HttpError(401, "Unauthorized: Invalid token!");
  }

  const userId = decoded.sub; // Cognito User ID
  if (!userId) {
    throw new HttpError(401, "Unauthorized: User ID not found in token!");
  }

  return userId;
}
