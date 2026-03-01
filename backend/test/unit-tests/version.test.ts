import { describe, expect, test, vi } from "vitest";
import { getVersionUpdate, HttpError } from "core";

// Use vi.hoisted to make the mock version available to vi.mock
const { TEST_RULESET_VERSION } = vi.hoisted(() => {
  return { TEST_RULESET_VERSION: "2.1.1" };
});

// Mock version from package.json which is used as the ruleset version
vi.mock("../../package.json", () => ({
  default: { version: TEST_RULESET_VERSION },
}));

describe("getVersionUpdate", () => {
  describe("when character version matches current version", () => {
    test("should return undefined for exact version match", () => {
      const result = getVersionUpdate(TEST_RULESET_VERSION);
      expect(result).toBeUndefined();
    });
  });

  describe("when character version is older but compatible", () => {
    test("should return version update for older minor version", () => {
      const characterVersion = "2.0.1";

      const result = getVersionUpdate(characterVersion);

      expect(result).toEqual({
        old: { value: characterVersion },
        new: { value: TEST_RULESET_VERSION },
      });
    });

    test("should return version update for older patch version", () => {
      const characterVersion = "2.1.0";

      const result = getVersionUpdate(characterVersion);

      expect(result).toEqual({
        old: { value: characterVersion },
        new: { value: TEST_RULESET_VERSION },
      });
    });
  });

  describe("when character major version is older", () => {
    test("should throw error for older major version", async () => {
      const characterVersion = "1.1.1";

      expect(() => getVersionUpdate(characterVersion)).toThrow(HttpError);
      expect(() => getVersionUpdate(characterVersion)).toThrow(
        expect.objectContaining({
          statusCode: 409,
        }),
      );
    });
  });

  describe("when character version is newer", () => {
    test("should throw error for newer major version", async () => {
      const characterVersion = "3.1.1";

      expect(() => getVersionUpdate(characterVersion)).toThrow(HttpError);
      expect(() => getVersionUpdate(characterVersion)).toThrow(
        expect.objectContaining({
          statusCode: 409,
        }),
      );
    });

    test("should throw error for newer minor version", async () => {
      const characterVersion = "2.2.1";

      expect(() => getVersionUpdate(characterVersion)).toThrow(HttpError);
      expect(() => getVersionUpdate(characterVersion)).toThrow(
        expect.objectContaining({
          statusCode: 409,
        }),
      );
    });

    test("should throw error for newer patch version", () => {
      const characterVersion = "2.1.2";

      expect(() => getVersionUpdate(characterVersion)).toThrow(HttpError);
      expect(() => getVersionUpdate(characterVersion)).toThrow(
        expect.objectContaining({
          statusCode: 409,
        }),
      );
    });
  });

  describe("edge cases and error handling", () => {
    test("should handle malformed version strings gracefully", () => {
      const malformedVersions = ["not-a-version", "1", "1.2", "v1.0.0", "1.0.0-beta", "", "1..0", ".1.0", "1.0."];

      malformedVersions.forEach((version) => {
        expect(() => getVersionUpdate(version)).toThrow(Error);
      });
    });

    test("should handle NaN in version parsing", () => {
      const versionsWithNaN = ["1.x.0", "a.b.c", "1.2.x"];

      versionsWithNaN.forEach((version) => {
        expect(() => getVersionUpdate(version)).toThrow(Error);
      });
    });

    test("should handle version with leading zeros", () => {
      const characterVersion = "02.01.01";

      // This should work fine as Number("02") === 2, and since it's the same version, it returns undefined
      const result = getVersionUpdate(characterVersion);
      expect(result).toBeUndefined();
    });

    test("should throw HttpError for very large version numbers with different major", () => {
      const characterVersion = "999.999.999";

      expect(() => getVersionUpdate(characterVersion)).toThrow(HttpError);
      expect(() => getVersionUpdate(characterVersion)).toThrow(
        expect.objectContaining({
          statusCode: 409,
        }),
      );
    });
  });
});
