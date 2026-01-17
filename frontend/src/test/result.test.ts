import { describe, it, expect } from "vitest";
import { ResultSuccess, ResultError } from "../lib/types/result";

describe("Result Type", () => {
  describe("ResultSuccess", () => {
    it("should create a successful result", () => {
      const data = { message: "success" };
      const result = ResultSuccess(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });
  });

  describe("ResultError", () => {
    it("should create an error result", () => {
      const error = new Error("Something went wrong");
      const result = ResultError(error);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe("Result static methods", () => {
    it("should work with ResultSuccess function", () => {
      const data = "test data";
      const result = ResultSuccess(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(data);
      }
    });

    it("should work with ResultError function", () => {
      const error = new Error("Test error");
      const result = ResultError(error);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe("Type guards", () => {
    it("should properly type guard success results", () => {
      const result = ResultSuccess("test");

      if (result.success) {
        // TypeScript should know this is a success result
        expect(typeof result.data).toBe("string");
        expect(result.data).toBe("test");
      }
    });

    it("should properly type guard error results", () => {
      const result = ResultError(new Error("test error"));

      if (!result.success) {
        // TypeScript should know this is an error result
        expect(result.error.message).toBe("test error");
      }
    });
  });
});
