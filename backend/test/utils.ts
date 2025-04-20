import { expect } from "vitest";
import { HttpError } from "utils/index.js";

export async function expectHttpError(fn: () => Promise<unknown>, statusCode: number) {
  try {
    await fn();
    throw new Error("Function didn't throw"); // Fail the test if no error is thrown
  } catch (err) {
    expect(err).toBeInstanceOf(HttpError);
    const httpErr = err as HttpError;
    expect(httpErr.statusCode).toBe(statusCode);
  }
}
