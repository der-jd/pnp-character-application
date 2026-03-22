import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  type InitiateAuthCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: import.meta.env.VITE_COGNITO_REGION,
});

const CLIENT_ID = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function parseTokens(result: InitiateAuthCommandOutput): AuthTokens {
  const auth = result.AuthenticationResult;
  if (!auth?.IdToken || !auth.AccessToken || !auth.RefreshToken) {
    throw new Error("Incomplete authentication response");
  }
  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken,
    expiresAt: Date.now() + (auth.ExpiresIn ?? 3600) * 1000,
  };
}

export async function signIn(username: string, password: string): Promise<AuthTokens> {
  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });
  const result = await client.send(command);
  return parseTokens(result);
}

export async function refreshSession(refreshToken: string): Promise<AuthTokens> {
  const command = new InitiateAuthCommand({
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });
  const result = await client.send(command);
  // Refresh doesn't return a new refresh token
  const auth = result.AuthenticationResult;
  if (!auth?.IdToken || !auth.AccessToken) {
    throw new Error("Incomplete refresh response");
  }
  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken,
    expiresAt: Date.now() + (auth.ExpiresIn ?? 3600) * 1000,
  };
}
