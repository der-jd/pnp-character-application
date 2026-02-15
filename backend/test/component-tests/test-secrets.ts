import { requireEnv } from "./shared.js";

export interface TestSecrets {
  cognitoPassword: string;
  cognitoClientId: string;
  cognitoRegion: string;
  cognitoUsername: string;
  cognitoClientSecret: string;
}

export function getTestSecrets(): TestSecrets {
  return {
    // Environment variables from CircleCI
    cognitoPassword: requireEnv("COMPONENT_TESTS_COGNITO_PASSWORD"),
    cognitoClientId: requireEnv("COMPONENT_TESTS_COGNITO_APP_CLIENT_ID"),
    cognitoRegion: requireEnv("COMPONENT_TESTS_COGNITO_REGION"),
    cognitoUsername: requireEnv("COMPONENT_TESTS_COGNITO_USERNAME"),
    cognitoClientSecret: requireEnv("COMPONENT_TESTS_COGNITO_CLIENT_SECRET"),
  };
}
