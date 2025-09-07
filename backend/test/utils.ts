import { expect } from "vitest";
import { HttpError } from "utils";

export async function expectHttpError(fn: () => Promise<unknown>, statusCode: number) {
  try {
    await fn();
    throw new Error("Function didn't throw"); // Fail the test if no error is thrown
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    const httpErr = error as HttpError;
    expect(httpErr.statusCode).toBe(statusCode);
  }
}
