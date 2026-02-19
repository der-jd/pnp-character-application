import { Character, Record } from "api-spec";

export interface TestContext {
  apiBaseUrl: string;
  idToken: string;
  userName: string;
  character: Character;
  lastHistoryRecord: Record;
}

const _testContext = {
  apiBaseUrl: "",
  idToken: "",
  userName: "",
  userId: "",
  character: undefined,
  lastHistoryRecord: undefined,
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

  return {
    apiBaseUrl: _testContext.apiBaseUrl,
    idToken: _testContext.idToken,
    userName: _testContext.userName,
    character: _testContext.character,
    lastHistoryRecord: _testContext.lastHistoryRecord,
  };
}
