import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

export const cognitoConfig = {
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  clientId: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID,
  region: process.env.NEXT_PUBLIC_COGNITO_REGION,
};

export const cognitoClient = new CognitoIdentityProviderClient({ region: cognitoConfig.region });
