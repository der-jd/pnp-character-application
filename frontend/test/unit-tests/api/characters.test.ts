import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCharacters, fetchCharacter, createCharacter, deleteCharacter, cloneCharacter } from "@/api/characters";
import * as client from "@/api/client";

vi.mock("@/api/client", () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  setTokenGetter: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public statusText: string,
      public body: unknown,
    ) {
      super(`API Error ${status}`);
    }
  },
}));

describe("characters API", () => {
  beforeEach(() => {
    vi.mocked(client.get).mockReset();
    vi.mocked(client.post).mockReset();
    vi.mocked(client.del).mockReset();
  });

  describe("fetchCharacters", () => {
    it("calls GET with the correct short-format path", async () => {
      vi.mocked(client.get).mockResolvedValue({ characters: [] });
      await fetchCharacters();
      expect(client.get).toHaveBeenCalledWith("/characters?character-short=true", expect.any(Object));
    });
  });

  describe("fetchCharacter", () => {
    it("calls GET with the character ID in the path", async () => {
      vi.mocked(client.get).mockResolvedValue({ character: {} });
      await fetchCharacter("char-123");
      expect(client.get).toHaveBeenCalledWith("/characters/char-123", expect.any(Object));
    });
  });

  describe("createCharacter", () => {
    it("calls POST with character data", async () => {
      const data = { name: "Test Hero" } as unknown as Parameters<typeof createCharacter>[0];
      vi.mocked(client.post).mockResolvedValue({ characterId: "new-123" });
      await createCharacter(data);
      expect(client.post).toHaveBeenCalledWith("/characters", expect.any(Object), data);
    });
  });

  describe("deleteCharacter", () => {
    it("calls DELETE with the character ID", async () => {
      vi.mocked(client.del).mockResolvedValue({});
      await deleteCharacter("char-456");
      expect(client.del).toHaveBeenCalledWith("/characters/char-456", expect.any(Object));
    });
  });

  describe("cloneCharacter", () => {
    it("calls POST with the clone endpoint and userIdOfCharacter", async () => {
      vi.mocked(client.post).mockResolvedValue({ characterId: "clone-789" });
      await cloneCharacter("char-123", "user-abc");
      expect(client.post).toHaveBeenCalledWith("/characters/char-123/clone", expect.any(Object), {
        userIdOfCharacter: "user-abc",
      });
    });
  });
});
