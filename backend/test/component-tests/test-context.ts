import { Character } from "api-spec";

export interface TestContext {
  apiBaseUrl: string;
  idToken: string;
  userName: string;
  userId: string;
  seedCharacterId: string;
  character?: Character;
}

export const testContext: TestContext = {
  apiBaseUrl: "",
  idToken: "",
  userName: "",
  userId: "",
  seedCharacterId: "",
  character: undefined,
};

export function getTestCharacter(): Character {
  if (!testContext.character) {
    throw new Error("Test character not set!");
  }
  return testContext.character;
}

export function setTestContext(context: Partial<TestContext>): void {
  Object.assign(testContext, context);
}

export function resetTestContext(): void {
  testContext.apiBaseUrl = "";
  testContext.idToken = "";
  testContext.userName = "";
  testContext.userId = "";
  testContext.character = undefined;
  testContext.seedCharacterId = "";
}
