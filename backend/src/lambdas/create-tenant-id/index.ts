import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
import * as jwt from "jsonwebtoken";

const cognito = new CognitoIdentityProvider();

export const handler = async (event: any): Promise<any> => {
  const userPoolId = process.env.USER_POOL_ID;
  const clientId = process.env.CLIENT_ID;

  if (!userPoolId || !clientId) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "User pool ID or client ID is not set in environment variables.",
      }),
    };
  }

  const token = event.headers.Authorization.split(" ")[1];

  let sub: string;
  try {
    const decoded: any = jwt.decode(token);
    if (!decoded.sub) {
      throw new Error("Token does not contain sub");
    }
    sub = decoded.sub;
  } catch (error) {
    console.error("Error decoding token:", error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Invalid token",
      }),
    };
  }

  const { tenantId, refreshToken } = JSON.parse(event.body);
  console.log(tenantId);

  try {
    await cognito.createGroup({
      GroupName: sub,
      UserPoolId: userPoolId,
      Description: `Group for user ${sub}`,
    });

    await cognito.adminAddUserToGroup({
      GroupName: sub,
      UserPoolId: userPoolId,
      Username: sub,
    });

    const authResponse = await cognito.initiateAuth({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });
    console.log("Generated new tokens");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Group created, user added, attributes updated, and tokens refreshed",
        tokens: authResponse.AuthenticationResult,
      }),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Error processing request",
          error: error.message,
        }),
      };
    } else {
      // Handle non-Error types of errors
      console.error("Unknown error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "An unknown error occurred",
          error: "Unknown error",
        }),
      };
    }
  }
};
