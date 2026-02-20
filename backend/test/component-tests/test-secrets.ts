import { requireEnv } from "./shared.js";

export interface TestSecrets {
  cognitoRegion: string;
  cognitoClientId: string;
  cognitoUsername: string;
  cognitoPassword: string;
}

export function getTestSecrets(): TestSecrets {
  return {
    // Environment variables from CircleCI
    cognitoRegion: requireEnv("COMPONENT_TESTS_COGNITO_REGION"),
    cognitoClientId: requireEnv("COMPONENT_TESTS_COGNITO_APP_CLIENT_ID"),
    cognitoUsername: requireEnv("COMPONENT_TESTS_COGNITO_USERNAME"),
    cognitoPassword: requireEnv("COMPONENT_TESTS_COGNITO_PASSWORD"),
  };
}
