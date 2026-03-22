import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchLevelUpOptions, applyLevelUp } from "@/api/level-up";
import * as client from "@/api/client";

vi.mock("@/api/client", () => ({
  get: vi.fn(),
  post: vi.fn(),
  setTokenGetter: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

describe("level-up API", () => {
  beforeEach(() => {
    vi.mocked(client.get).mockReset();
    vi.mocked(client.post).mockReset();
  });

  describe("fetchLevelUpOptions", () => {
    it("calls GET with the correct path", async () => {
      vi.mocked(client.get).mockResolvedValue({ effects: [] });
      await fetchLevelUpOptions("char-1");
      expect(client.get).toHaveBeenCalledWith("/characters/char-1/level-up", expect.any(Object));
    });
  });

  describe("applyLevelUp", () => {
    it("calls POST with the level-up data", async () => {
      vi.mocked(client.post).mockResolvedValue({});
      const data = { effectKind: "hpRoll", diceResult: 4, optionsHash: "abc123" };
      await applyLevelUp("char-1", data as unknown as Parameters<typeof applyLevelUp>[1]);
      expect(client.post).toHaveBeenCalledWith("/characters/char-1/level-up", expect.any(Object), data);
    });
  });
});
