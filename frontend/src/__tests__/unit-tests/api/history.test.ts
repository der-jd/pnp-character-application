import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchHistory, updateHistoryComment, revertHistoryRecord } from "@/api/history";
import * as client from "@/api/client";

vi.mock("@/api/client", () => ({
  get: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
  setTokenGetter: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

describe("history API", () => {
  beforeEach(() => {
    vi.mocked(client.get).mockReset();
    vi.mocked(client.patch).mockReset();
    vi.mocked(client.del).mockReset();
  });

  describe("fetchHistory", () => {
    it("calls GET without block-number when not specified", async () => {
      vi.mocked(client.get).mockResolvedValue({ blocks: [] });
      await fetchHistory("char-1");
      expect(client.get).toHaveBeenCalledWith("/characters/char-1/history", expect.any(Object));
    });

    it("includes block-number query param when specified", async () => {
      vi.mocked(client.get).mockResolvedValue({ blocks: [] });
      await fetchHistory("char-1", 3);
      expect(client.get).toHaveBeenCalledWith("/characters/char-1/history?block-number=3", expect.any(Object));
    });
  });

  describe("updateHistoryComment", () => {
    it("calls PATCH with comment in body", async () => {
      vi.mocked(client.patch).mockResolvedValue({});
      await updateHistoryComment("char-1", "record-42", "Test comment");
      expect(client.patch).toHaveBeenCalledWith("/characters/char-1/history/record-42", expect.any(Object), {
        comment: "Test comment",
      });
    });

    it("includes block-number when specified", async () => {
      vi.mocked(client.patch).mockResolvedValue({});
      await updateHistoryComment("char-1", "record-42", "Test comment", 2);
      expect(client.patch).toHaveBeenCalledWith(
        "/characters/char-1/history/record-42?block-number=2",
        expect.any(Object),
        { comment: "Test comment" },
      );
    });
  });

  describe("revertHistoryRecord", () => {
    it("calls DELETE with the record ID", async () => {
      vi.mocked(client.del).mockResolvedValue({});
      await revertHistoryRecord("char-1", "record-42");
      expect(client.del).toHaveBeenCalledWith("/characters/char-1/history/record-42", expect.any(Object));
    });
  });
});
