import { beforeAll } from "vitest";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";
import {
  Character,
  deleteCharacterResponseSchema,
  getCharacterResponseSchema,
  postCharacterCloneResponseSchema,
} from "api-spec";
import { testContext, setTestContext } from "./test-context.js";
import { ApiClient, ApiError } from "./api-client.js";
import { getTestSecrets, TestSecrets } from "./test-secrets.js";
import { requireEnv } from "./shared.js";

export let apiClient: ApiClient;

beforeAll(async () => {
  console.log("Setting up component tests...");

  // Environment variables from CircleCI
  const apiBaseUrl = requireEnv("COMPONENT_TESTS_API_BASE_URL");
  const seedCharacterId = requireEnv("COMPONENT_TESTS_SEED_CHARACTER_ID");

  const secrets = getTestSecrets();
  const idToken = await authenticate(secrets);

  // Extract user ID from JWT token
  const tokenParts = idToken.split(".");
  const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());
  const userId = payload.sub || payload["cognito:username"];

  apiClient = new ApiClient(apiBaseUrl, idToken);

  console.log(`API Base URL: ${apiBaseUrl}`);
  console.log(`User name: ${secrets.cognitoUsername}`);
  console.log(`User ID: ${userId}`);
  console.log(`Seed character: ${seedCharacterId}`);

  setTestContext({
    apiBaseUrl,
    idToken,
    userName: secrets.cognitoUsername,
    userId,
    seedCharacterId,
  });
});

export async function setupTestCharacter(): Promise<Character> {
  const cloneResponse = await apiClient.post(`characters/${testContext.seedCharacterId}/clone`, {
    userIdOfCharacter: testContext.userId,
  });
  const parsedClone = postCharacterCloneResponseSchema.parse(cloneResponse);
  const clonedCharacterId = parsedClone.characterId;

  const clonedCharacter = getCharacterResponseSchema.parse(await apiClient.get(`characters/${clonedCharacterId}`));
  if (clonedCharacter.characterId !== clonedCharacterId) {
    throw new Error("Failed to fetch cloned character");
  }

  setTestContext({ character: clonedCharacter });
  console.log(`Cloned character ${testContext.seedCharacterId} -> ${clonedCharacterId}`);

  return clonedCharacter;
}

export async function cleanupTestCharacter(clonedCharacterId: string): Promise<void> {
  if (clonedCharacterId) {
    await deleteCharacter(clonedCharacterId);
    // Clear character from test context
    setTestContext({ character: undefined });
  }
}

export async function deleteCharacter(characterId: string): Promise<void> {
  try {
    const response = await apiClient.delete(`characters/${characterId}`);
    deleteCharacterResponseSchema.parse(response);
    console.log(`Deleted character ${characterId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return; // TODO is this behavior correct?
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to delete character", message);
    throw error;
  }
}

function createSecretHash(username: string, clientId: string, clientSecret: string): string {
  return createHmac("sha256", clientSecret).update(`${username}${clientId}`).digest("base64");
}

async function authenticate(secrets: TestSecrets): Promise<string> {
  const client = new CognitoIdentityProviderClient({ region: secrets.cognitoRegion });

  const authParameters: Record<string, string> = {
    USERNAME: secrets.cognitoUsername,
    PASSWORD: secrets.cognitoPassword,
  };

  if (secrets.cognitoClientSecret) {
    authParameters.SECRET_HASH = createSecretHash(
      secrets.cognitoUsername,
      secrets.cognitoClientId,
      secrets.cognitoClientSecret,
    );
  }

  const response = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: secrets.cognitoClientId,
      AuthParameters: authParameters,
    }),
  );

  const idToken = response.AuthenticationResult?.IdToken;
  if (!idToken) {
    throw new Error("Cognito authentication did not return an IdToken");
  }

  return idToken;
}
