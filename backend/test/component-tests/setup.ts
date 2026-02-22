import { beforeAll } from "vitest";
import { TestContextFactory } from "./test-context-factory.js";

beforeAll(async () => {
  console.log("Setting up component tests...");
  await TestContextFactory.initializeBaseSetup();
});
