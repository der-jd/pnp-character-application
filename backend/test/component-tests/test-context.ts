import { Character, HistoryRecord } from "api-spec";
import { ApiClient } from "./api-client.js";

export interface TestContext {
  apiBaseUrl: string;
  authorizationHeader: string;
  userId: string;
  seedCharacterId: string;
  character: Character;
  lastHistoryRecord: HistoryRecord;
  latestHistoryBlockNumber: number;
  apiClient: ApiClient;
}

// TODO global variables raise issues with parallel test execution
const _testContext = {
  apiBaseUrl: "",
  authorizationHeader: "",
  userId: "",
  seedCharacterId: "",
  character: undefined,
  lastHistoryRecord: undefined,
  latestHistoryBlockNumber: undefined,
  apiClient: undefined,
};

export function setTestContext(context: Partial<TestContext>): void {
  Object.assign(_testContext, context);
}

export function getTestContext(): TestContext {
  if (!_testContext.character) {
    throw new Error("Test context not initialized - character not set");
  }

  if (!_testContext.lastHistoryRecord) {
    throw new Error("Test context not initialized - lastHistoryRecord not set");
  }

  if (!_testContext.latestHistoryBlockNumber) {
    throw new Error("Test context not initialized - latestHistoryBlockNumber not set");
  }

  if (!_testContext.apiClient) {
    throw new Error("Test context not initialized - apiClient not set");
  }

  return {
    apiBaseUrl: _testContext.apiBaseUrl,
    authorizationHeader: _testContext.authorizationHeader,
    userId: _testContext.userId,
    seedCharacterId: _testContext.seedCharacterId,
    character: _testContext.character,
    lastHistoryRecord: _testContext.lastHistoryRecord,
    latestHistoryBlockNumber: _testContext.latestHistoryBlockNumber,
    apiClient: _testContext.apiClient,
  };
}
