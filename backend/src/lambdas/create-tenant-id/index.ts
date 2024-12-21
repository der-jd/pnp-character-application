import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";
import jwt, { JwtPayload } from "jsonwebtoken"; // Install jsonwebtoken

export const handler = async (event: any) => {
  const token = event.authorizationToken?.split(" ")[1]; // Extract the token
  if (!token) {
      return generatePolicy("Deny", event.methodArn);
  }

  try {
      // Validate JWT (you can use a library like jsonwebtoken)
      const decodedToken = verifyToken(token); // Implement your token verification
      const tenantId = decodedToken["custom:tenant_id"]; // Extract custom claim

      if (!tenantId) {
          throw new Error("Missing tenant ID");
      }

      // Generate an Allow policy
      return generatePolicy("Allow", event.methodArn, { tenantId });
  } catch (err) {
      console.error("Token validation failed:", err.message);
      return generatePolicy("Deny", event.methodArn);
  }
};

// Helper to generate an IAM policy
const generatePolicy = (effect: "Allow" | "Deny", resource: string, context?: any) => ({
  principalId: "user",
  policyDocument: {
      Version: "2012-10-17",
      Statement: [
          {
              Action: "execute-api:Invoke",
              Effect: effect,
              Resource: resource,
          },
      ],
  },
  context,
});

// Dummy token verification (replace with your logic)
const verifyToken = (token: string) => {
  // Use a library like jsonwebtoken to decode/validate the token
  return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
};