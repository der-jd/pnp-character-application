import {
  CognitoIdentityProviderClient,
  ChangePasswordCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
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

export interface NewPasswordChallenge {
  type: "NEW_PASSWORD_REQUIRED";
  session: string;
  username: string;
}

export type SignInResult = AuthTokens | NewPasswordChallenge;

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

export function isNewPasswordChallenge(result: SignInResult): result is NewPasswordChallenge {
  return "type" in result && result.type === "NEW_PASSWORD_REQUIRED";
}

export async function signIn(username: string, password: string): Promise<SignInResult> {
  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });
  const result = await client.send(command);

  if (result.ChallengeName === "NEW_PASSWORD_REQUIRED" && result.Session) {
    return {
      type: "NEW_PASSWORD_REQUIRED",
      session: result.Session,
      username,
    };
  }

  return parseTokens(result);
}

export async function completeNewPassword(session: string, username: string, newPassword: string): Promise<AuthTokens> {
  const command = new RespondToAuthChallengeCommand({
    ClientId: CLIENT_ID,
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    Session: session,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: newPassword,
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

export async function changePassword(accessToken: string, currentPassword: string, newPassword: string): Promise<void> {
  const command = new ChangePasswordCommand({
    AccessToken: accessToken,
    PreviousPassword: currentPassword,
    ProposedPassword: newPassword,
  });
  await client.send(command);
}
