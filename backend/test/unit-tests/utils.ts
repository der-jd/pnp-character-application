import { expect } from "vitest";
import { ErrorResponse } from "core";

export async function expectHttpError(fn: () => Promise<unknown>, statusCode: number) {
  const result = (await fn()) as ErrorResponse;
  expect(result.statusCode).toBe(statusCode);
  const body = JSON.parse(result.body);
  expect(body.statusCode).toBe(statusCode);
  expect(body.message).toBeDefined();
}
