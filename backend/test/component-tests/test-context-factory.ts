import { expect } from "vitest";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import {
  Character,
  deleteCharacterResponseSchema,
  getCharacterResponseSchema,
  getHistoryResponseSchema,
  HistoryRecord,
  postCharacterCloneResponseSchema,
} from "api-spec";
import { ApiClient } from "./api-client.js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export interface TestContext {
  apiBaseUrl: string;
  authorizationHeader: string;
  userId: string;
  seedCharacterId: string;
  apiClient: ApiClient;
  character: Character;
  lastHistoryRecord: HistoryRecord;
  latestHistoryBlockNumber: number;
}

export class TestContextFactory {
  private static baseSetup:
    | {
        apiBaseUrl: string;
        authorizationHeader: string;
        userId: string;
        seedCharacterId: string;
        apiClient: ApiClient;
      }
    | undefined;

  static async initializeBaseSetup(): Promise<void> {
    if (this.baseSetup) {
      return; // Already initialized
    }

    console.log("Initializing base test setup...");

    // Environment variable from Terraform via CircleCI
    const apiBaseUrl = requireEnv("COMPONENT_TESTS_API_BASE_URL");

    const seedCharacterId = this.loadCharacterIdFromTestData("test-data/default-character.dynamodb.json");

    const secrets = getTestSecrets();
    const userId = secrets.cognitoUsername;
    const idToken = await authenticate(secrets);
    const authorizationHeader = `Bearer ${idToken}`;

    console.log(`API Base URL: ${apiBaseUrl}`);
    console.log(`User name: ${secrets.cognitoUsername}`);
    console.log(`Seed character ID: ${seedCharacterId}`);

    this.baseSetup = {
      apiBaseUrl,
      authorizationHeader,
      userId,
      seedCharacterId,
      apiClient: new ApiClient(apiBaseUrl, authorizationHeader),
    };
  }

  static async createContext(seedCharacterId?: string): Promise<TestContext> {
    if (!this.baseSetup) {
      throw new Error("Base setup not initialized. Call initializeBaseSetup() first.");
    }

    if (seedCharacterId) {
      console.log(`Using new seed character ID: ${seedCharacterId}`);
      this.baseSetup.seedCharacterId = seedCharacterId;
    }

    // Clone the seed character to get a fresh character for testing
    const cloneResponse = postCharacterCloneResponseSchema.parse(
      await this.baseSetup.apiClient.post(`characters/${this.baseSetup.seedCharacterId}/clone`, {
        userIdOfCharacter: this.baseSetup.userId,
      }),
    );
    console.log(
      `Cloned seed character '${this.baseSetup.seedCharacterId}' to '${cloneResponse.characterId}' for test suite.`,
    );

    const clonedCharacter = getCharacterResponseSchema.parse(
      await this.baseSetup.apiClient.get(`characters/${cloneResponse.characterId}`),
    );
    if (clonedCharacter.characterId !== cloneResponse.characterId) {
      throw new Error("Failed to fetch cloned character");
    }

    const { latestBlock, latestRecord } = await this.getLatestHistoryRecord(cloneResponse.characterId);

    return {
      apiBaseUrl: this.baseSetup.apiBaseUrl,
      authorizationHeader: this.baseSetup.authorizationHeader,
      userId: this.baseSetup.userId,
      seedCharacterId: this.baseSetup.seedCharacterId,
      apiClient: this.baseSetup.apiClient,
      character: clonedCharacter,
      lastHistoryRecord: latestRecord,
      latestHistoryBlockNumber: latestBlock.blockNumber,
    };
  }

  static async cleanupContext(context: TestContext): Promise<void> {
    await this.deleteCharacter(context.apiClient, context.character.characterId);
  }

  static loadCharacterIdFromTestData(relativePath: string): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const absolutePath = join(__dirname, relativePath);
    const characterData = JSON.parse(readFileSync(absolutePath, "utf8"));
    const characterId = characterData.characterId.S;
    if (!characterId) {
      throw new Error(`Character ID not found in test data file: ${relativePath}`);
    }
    return characterId;
  }

  static async deleteCharacter(apiClient: ApiClient, characterId: string) {
    try {
      const response = await apiClient.delete(`characters/${characterId}`);
      deleteCharacterResponseSchema.parse(response);
      console.log(`Deleted character ${characterId} from test suite.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to delete character ${characterId} from test suite.`, message);
      throw error;
    }
  }

  static async getLatestHistoryRecord(characterId: string) {
    if (!this.baseSetup) {
      throw new Error("Base setup not initialized!");
    }

    const history = getHistoryResponseSchema.parse(
      await this.baseSetup.apiClient.get(`characters/${characterId}/history`),
    );

    expect(history.items.length).toBeGreaterThanOrEqual(1);

    const latestBlock = history.items[0];
    expect(latestBlock.changes.length).toBeGreaterThanOrEqual(1);

    const latestRecord = latestBlock.changes[latestBlock.changes.length - 1];
    return { latestBlock, latestRecord };
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

interface TestSecrets {
  cognitoRegion: string;
  cognitoClientId: string;
  cognitoUsername: string;
  cognitoPassword: string;
}

function getTestSecrets(): TestSecrets {
  return {
    // Environment variables from Terraform via CircleCI
    cognitoRegion: requireEnv("COMPONENT_TESTS_COGNITO_REGION"),
    cognitoClientId: requireEnv("COMPONENT_TESTS_COGNITO_APP_CLIENT_ID"),
    // Environment variables from CircleCI
    cognitoUsername: requireEnv("COMPONENT_TESTS_COGNITO_USERNAME"),
    cognitoPassword: requireEnv("COMPONENT_TESTS_COGNITO_PASSWORD"),
  };
}

async function authenticate(secrets: TestSecrets): Promise<string> {
  const client = new CognitoIdentityProviderClient({ region: secrets.cognitoRegion });

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: secrets.cognitoClientId,
    AuthParameters: {
      USERNAME: secrets.cognitoUsername,
      PASSWORD: secrets.cognitoPassword,
    },
  });

  const response = await client.send(command);

  const idToken = response.AuthenticationResult?.IdToken;
  if (!idToken) {
    throw new Error("Cognito authentication did not return an IdToken");
  }

  return idToken;
}
