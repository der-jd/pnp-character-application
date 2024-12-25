import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
import * as jwt from "jsonwebtoken";

import { APIGatewayProxyEvent } from "aws-lambda";

const cognito = new CognitoIdentityProvider();

async function refreshTokens(refreshToken: string, clientId: string) {
  try {
    const response = await cognito.initiateAuth({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    if (response.AuthenticationResult) {
      const { AccessToken, IdToken } = response.AuthenticationResult;

      return {
        accessToken: AccessToken,
        idToken: IdToken,
      };
    } else {
      throw new Error("No AuthenticationResult found in the response.");
    }
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    throw error;
  }
}

export const handler = async (event: APIGatewayProxyEvent) => {
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

  if (!event.headers.Authorization) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "No Authorization header received!",
      }),
    };
  }

  const id_token = event.headers.Authorization.split(" ")[1];
  const refresh_token = event.headers.refresh_token?.split(" ")[1];

  console.log(id_token);

  let sub: string;
  try {
    const decoded: jwt.JwtPayload | string | null = jwt.decode(id_token);

    if (!decoded || typeof decoded == "string") {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: "Error: Invalid id_token",
        }),
      };
    }

    if (!decoded.sub) {
      throw new Error("id_token does not contain sub");
    }

    sub = decoded.sub;
  } catch (error) {
    console.error("Error decoding id_token:", error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Invalid id_token",
      }),
    };
  }

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

  if (!refresh_token || !clientId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Refresh token or client ID is missing.",
      }),
    };
  }

  try {
    const updated_tokens = await refreshTokens(refresh_token, clientId);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Required for CORS support to work
        "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
      },
      body: JSON.stringify({
        message: "Tokens refreshed successfully.",
        tokens: updated_tokens,
      }),
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Failed to refresh tokens.",
          error: error.message,
        }),
      };
    }
  }
};
