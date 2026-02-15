import { Character } from "api-spec";

export interface TestContext {
  apiBaseUrl: string;
  idToken: string;
  userName: string;
  character: Character;
}

const _testContext = {
  apiBaseUrl: "",
  idToken: "",
  userName: "",
  userId: "",
  seedCharacter: undefined,
  character: undefined,
};

export function setTestContext(context: Partial<TestContext>): void {
  Object.assign(_testContext, context);
}

export function getTestContext(): TestContext {
  if (!_testContext.character) {
    throw new Error("Test context not initialized - character not set");
  }
  return {
    apiBaseUrl: _testContext.apiBaseUrl,
    idToken: _testContext.idToken,
    userName: _testContext.userName,
    character: _testContext.character,
  };
}
