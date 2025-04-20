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
      return {
        statusCode: 200,
        body: JSON.stringify(response.AuthenticationResult),
      };
    } else {
      return {
        statusCode: 500,
        body: "Error: Could not refresh token",
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: "Error: Could not refresh tokens!",
    };
  }
}

export const handler = async (event: APIGatewayProxyEvent) => {
  const userPoolId = process.env.USER_POOL_ID;
  const clientId = process.env.CLIENT_ID;

  if (!userPoolId || !clientId) {
    return {
      statusCode: 500,
      body: "Error: User pool ID or client ID is not set in environment variables.",
    };
  }

  if (!event.headers.Authorization) {
    return {
      statusCode: 500,
      body: "Error: No Authorization header received!",
    };
  }

  const id_token = event.headers.Authorization.split(" ")[1];
  const refresh_token = event.headers.refresh_token?.split(" ")[1];

  let sub: string;

  try {
    const decoded: jwt.JwtPayload | string | null = jwt.decode(id_token);

    if (!decoded || typeof decoded == "string") {
      return {
        statusCode: 500,
        body: "Error: Invalid token!",
      };
    }

    if (!decoded.sub) {
      return {
        statusCode: 500,
        body: "Error: Sub field not supplied!",
      };
    }

    sub = decoded.sub;
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: "Error: Invalid token!",
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
      return {
        statusCode: 500,
        body: "Error: Processing request failed!",
      };
    } else {
      return {
        statusCode: 500,
        body: "Error: Unknown error occurred!",
      };
    }
  }

  if (!refresh_token) {
    return {
      statusCode: 500,
      body: "Error: Refresh token missing!",
    };
  }

  try {
    const updated_tokens = await refreshTokens(refresh_token, clientId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tokens refreshed successfully.",
        tokens: updated_tokens,
      }),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return {
        statusCode: 500,
        body: "Error: Failed to refresh tokens!",
      };
    }
  }
};
