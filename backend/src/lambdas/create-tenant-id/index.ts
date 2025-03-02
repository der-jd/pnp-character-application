import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
import * as jwt from "jsonwebtoken";
import { add_cors_headers, api_error } from "config/index.js";

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
      return add_cors_headers({
        statusCode: 200,
        body: JSON.stringify(response.AuthenticationResult),
      });
    } else {
      return api_error("Could not refresh token");
    }
  } catch (error) {
    console.error(error);
    return api_error("Could not refresh tokens!");
  }
}

export const handler = async (event: APIGatewayProxyEvent) => {
  const userPoolId = process.env.USER_POOL_ID;
  const clientId = process.env.CLIENT_ID;

  if (!userPoolId || !clientId) {
    return api_error("User pool ID or client ID is not set in environment variables.");
  }

  if (!event.headers.Authorization) {
    return api_error("No Authorization header received!");
  }

  const id_token = event.headers.Authorization.split(" ")[1];
  const refresh_token = event.headers.refresh_token?.split(" ")[1];

  let sub: string;

  try {
    const decoded: jwt.JwtPayload | string | null = jwt.decode(id_token);

    if (!decoded || typeof decoded == "string") {
      return api_error("Invalid token!");
    }

    if (!decoded.sub) {
      return api_error("Sub field not supplied!");
    }

    sub = decoded.sub;
  } catch (error) {
    console.error(error);
    return api_error("Invalid token!");
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
      return api_error("Processing request failed!");
    } else {
      return api_error("Unknown error occured!");
    }
  }

  if (!refresh_token) {
    return api_error("Refresh token missing!");
  }

  try {
    const updated_tokens = await refreshTokens(refresh_token, clientId);

    return add_cors_headers({
      statusCode: 200,
      body: JSON.stringify({
        message: "Tokens refreshed successfully.",
        tokens: updated_tokens,
      }),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return api_error("Failed to refresh tokens!");
    }
  }
};
