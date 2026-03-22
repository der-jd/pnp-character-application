import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { get, post, patch, del, setTokenGetter, ApiError } from "@/api/client";

// Save original fetch
const originalFetch = globalThis.fetch;

describe("API client", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    setTokenGetter(() => "test-id-token-123");
    mockFetch.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const testSchema = z.object({ id: z.string(), name: z.string() });

  describe("authentication", () => {
    it("throws when no token getter is set", async () => {
      setTokenGetter(() => null);
      await expect(get("/test", testSchema)).rejects.toThrow("Not authenticated");
    });

    it("includes Bearer token in Authorization header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "1", name: "Test" }),
      });

      await get("/test", testSchema);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-id-token-123",
          }),
        }),
      );
    });
  });

  describe("request methods", () => {
    it("GET sends correct method and no body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "1", name: "Test" }),
      });

      await get("/characters", testSchema);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/characters"),
        expect.objectContaining({ method: "GET", body: undefined }),
      );
    });

    it("POST sends correct method and JSON body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "1", name: "New" }),
      });

      await post("/characters", testSchema, { name: "New" });

      const callArgs = mockFetch.mock.calls[0]!;
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].body).toBe(JSON.stringify({ name: "New" }));
      expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
    });

    it("PATCH sends correct method and JSON body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "1", name: "Updated" }),
      });

      await patch("/characters/1", testSchema, { name: "Updated" });

      const callArgs = mockFetch.mock.calls[0]!;
      expect(callArgs[1].method).toBe("PATCH");
      expect(callArgs[1].body).toBe(JSON.stringify({ name: "Updated" }));
    });

    it("DELETE sends correct method and no body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "1", name: "Deleted" }),
      });

      await del("/characters/1", testSchema);

      const callArgs = mockFetch.mock.calls[0]!;
      expect(callArgs[1].method).toBe("DELETE");
      expect(callArgs[1].body).toBeUndefined();
    });
  });

  describe("URL construction", () => {
    it("prepends base URL to the path", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "1", name: "Test" }),
      });

      await get("/characters", testSchema);

      expect(mockFetch).toHaveBeenCalledWith("https://api.test.example.com/v1/characters", expect.any(Object));
    });
  });

  describe("response handling", () => {
    it("parses valid response through Zod schema", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "42", name: "Hero" }),
      });

      const result = await get("/test", testSchema);
      expect(result).toEqual({ id: "42", name: "Hero" });
    });

    it("throws ZodError when response doesn't match schema", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 123, wrong: "field" }),
      });

      await expect(get("/test", testSchema)).rejects.toThrow();
    });

    it("throws ApiError on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: () => Promise.resolve({ message: "Character not found" }),
      });

      try {
        await get("/test", testSchema);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(404);
        expect(apiErr.statusText).toBe("Not Found");
        expect(apiErr.body).toEqual({ message: "Character not found" });
      }
    });

    it("handles non-JSON error response body gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
      });

      try {
        await get("/test", testSchema);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(500);
        expect(apiErr.body).toBeNull();
      }
    });
  });
});
