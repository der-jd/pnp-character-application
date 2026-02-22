import { beforeAll } from "vitest";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { deleteCharacterResponseSchema, getCharacterResponseSchema, postCharacterCloneResponseSchema } from "api-spec";
import { getTestContext, setTestContext } from "./test-context.js";
import { ApiClient, ApiError } from "./api-client.js";
import { getTestSecrets, TestSecrets } from "./test-secrets.js";
import { getLatestHistoryRecord, requireEnv } from "./shared.js";

beforeAll(async () => {
  console.log("Setting up component tests...");

  // Environment variables from CircleCI
  const apiBaseUrl = requireEnv("COMPONENT_TESTS_API_BASE_URL");
  const seedCharacterId = requireEnv("COMPONENT_TESTS_SEED_CHARACTER_ID");

  const secrets = getTestSecrets();
  const userId = secrets.cognitoUsername;
  const idToken = await authenticate(secrets);
  const authorizationHeader = `Bearer ${idToken}`;

  console.log(`API Base URL: ${apiBaseUrl}`);
  console.log(`User name: ${secrets.cognitoUsername}`);
  console.log(`Seed character ID: ${seedCharacterId}`);

  setTestContext({
    apiBaseUrl,
    authorizationHeader,
    userId,
    seedCharacterId: seedCharacterId,
    apiClient: new ApiClient(apiBaseUrl, authorizationHeader),
  });
});

export async function setupTestContext(): Promise<void> {
  const cloneResponse = await getTestContext().apiClient.post(`characters/${getTestContext().seedCharacterId}/clone`, {
    userIdOfCharacter: getTestContext().userId,
  });
  const parsedClone = postCharacterCloneResponseSchema.parse(cloneResponse);
  const clonedCharacterId = parsedClone.characterId;

  const clonedCharacter = getCharacterResponseSchema.parse(
    await getTestContext().apiClient.get(`characters/${clonedCharacterId}`),
  );
  if (clonedCharacter.characterId !== clonedCharacterId) {
    throw new Error("Failed to fetch cloned character");
  }

  const { latestBlock, latestRecord } = await getLatestHistoryRecord(clonedCharacterId);

  setTestContext({
    character: clonedCharacter,
    lastHistoryRecord: latestRecord,
    latestHistoryBlockNumber: latestBlock.blockNumber,
  });
  console.log(`Cloned character ${getTestContext().seedCharacterId} -> ${clonedCharacterId}`);
}

export async function cleanUpTestContext(): Promise<void> {
  await deleteCharacter(getTestContext().character.characterId);
  setTestContext({ character: undefined, lastHistoryRecord: undefined, latestHistoryBlockNumber: undefined });
}

// TODO remove export
export async function deleteCharacter(characterId: string): Promise<void> {
  try {
    const response = await getTestContext().apiClient.delete(`characters/${characterId}`);
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

async function authenticate(secrets: TestSecrets): Promise<string> {
  const client = new CognitoIdentityProviderClient({ region: secrets.cognitoRegion });

  const response = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: secrets.cognitoClientId,
      AuthParameters: {
        USERNAME: secrets.cognitoUsername,
        PASSWORD: secrets.cognitoPassword,
      },
    }),
  );

  const idToken = response.AuthenticationResult?.IdToken;
  if (!idToken) {
    throw new Error("Cognito authentication did not return an IdToken");
  }

  return idToken;
}
