import { vi, describe, it, expect, beforeEach } from "vitest";
import { CharacterService } from "../../lib/services/characterService";
import { ApiClient } from "../../lib/services/apiClient";
import { createApiError } from "../../lib/types/result";

// Mock the ApiClient
vi.mock("../../lib/services/apiClient");

describe("CharacterService", () => {
  let characterService: CharacterService;
  let mockApiClient: ApiClient;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create mock API client
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // Make the mocked constructor return our mock
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Create service instance
    characterService = new CharacterService();
  });

  describe("getCharacter", () => {
    it("should get character successfully", async () => {
      const mockResponse = {
        success: true as const,
        data: {
          userId: "user123",
          characterId: "char456",
          characterSheet: {
            generalInformation: { name: "Test Character", level: 5 },
            calculationPoints: {
              adventurePoints: { available: 50 },
              attributePoints: { available: 10 },
            },
          },
        },
      };

      vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);

      const result = await characterService.getCharacter("char456", "token123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.characterId).toBe("char456");
        expect(result.data.name).toBe("Test Character");
      }
      expect(mockApiClient.get).toHaveBeenCalledWith("characters/char456", "token123");
    });

    it("should handle API errors when getting character", async () => {
      const mockError = {
        success: false as const,
        error: createApiError("Character not found", 404, "characters/char456", "GET"),
      };

      vi.mocked(mockApiClient.get).mockResolvedValue(mockError);

      const result = await characterService.getCharacter("char456", "token123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character not found");
      }
    });
  });

  describe("getAllCharacters", () => {
    it("should get all characters successfully", async () => {
      const mockResponse = {
        success: true as const,
        data: {
          characters: [
            {
              userId: "user123",
              characterId: "char1",
              characterSheet: {
                generalInformation: { name: "Character 1", level: 1 },
                calculationPoints: {
                  adventurePoints: { available: 100 },
                  attributePoints: { available: 40 },
                },
              },
            },
            {
              userId: "user123",
              characterId: "char2",
              characterSheet: {
                generalInformation: { name: "Character 2", level: 3 },
                calculationPoints: {
                  adventurePoints: { available: 80 },
                  attributePoints: { available: 35 },
                },
              },
            },
          ],
        },
      };

      vi.mocked(mockApiClient.get).mockResolvedValue(mockResponse);

      const result = await characterService.getAllCharacters("token123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe("Character 1");
        expect(result.data[1].name).toBe("Character 2");
      }
      expect(mockApiClient.get).toHaveBeenCalledWith("characters?character-short=true", "token123");
    });

    it("should handle API errors when fetching all characters", async () => {
      const mockError = {
        success: false as const,
        error: createApiError("Unauthorized", 401, "characters", "GET"),
      };

      vi.mocked(mockApiClient.get).mockResolvedValue(mockError);

      const result = await characterService.getAllCharacters("invalidToken");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Unauthorized");
      }
    });
  });

  describe("createCharacter", () => {
    it("should create a new character successfully", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const characterData = {
        generalInformation: { name: "New Character", level: 1 },
      } as any;

      const mockResponse = {
        success: true as const,
        data: {
          data: {
            changes: {
              new: {
                character: {
                  userId: "user123",
                  characterId: "newChar123",
                  characterSheet: {
                    generalInformation: { name: "New Character", level: 1 },
                    calculationPoints: {
                      adventurePoints: { available: 100 },
                      attributePoints: { available: 40 },
                    },
                  },
                },
              },
            },
          },
        },
      };

      vi.mocked(mockApiClient.post).mockResolvedValue(mockResponse);

      const result = await characterService.createCharacter(characterData, "token123");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.characterId).toBe("newChar123");
        expect(result.data.name).toBe("New Character");
      }
      expect(mockApiClient.post).toHaveBeenCalledWith("characters", characterData, "token123");
    });

    it("should handle API errors when creating character", async () => {
      const characterData = { generalInformation: { name: "New Character", level: 1 } } as any;

      const mockError = {
        success: false as const,
        error: createApiError("Invalid character data", 400, "characters", "POST"),
      };

      vi.mocked(mockApiClient.post).mockResolvedValue(mockError);

      const result = await characterService.createCharacter(characterData, "token123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Invalid character data");
      }
    });
  });

  describe("deleteCharacter", () => {
    it("should delete character successfully", async () => {
      const mockResponse = {
        success: true as const,
        data: { message: "Character deleted" },
      };

      vi.mocked(mockApiClient.delete).mockResolvedValue(mockResponse);

      const result = await characterService.deleteCharacter("char123", "token123");

      expect(result.success).toBe(true);
      expect(mockApiClient.delete).toHaveBeenCalledWith("characters/char123", "token123");
    });

    it("should handle API errors when deleting character", async () => {
      const mockError = {
        success: false as const,
        error: createApiError("Character not found", 404, "characters/char123", "DELETE"),
      };

      vi.mocked(mockApiClient.delete).mockResolvedValue(mockError);

      const result = await characterService.deleteCharacter("char123", "token123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Character not found");
      }
    });
  });

  describe("updateSkill", () => {
    it("should update skill successfully", async () => {
      const updateData = {
        current: { initialValue: 5, increasedPoints: 3 },
      };

      const mockResponse = {
        success: true as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {} as any, // Response type is complex, just verify the call works
      };

      vi.mocked(mockApiClient.patch).mockResolvedValue(mockResponse);

      const result = await characterService.updateSkill("char123", "combat", "attack", updateData, "token123");

      expect(result.success).toBe(true);
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        "characters/char123/skills/combat/attack",
        updateData,
        "token123"
      );
    });
  });

  describe("updateAttribute", () => {
    it("should update attribute successfully", async () => {
      const updateData = {
        current: { initialValue: 10, increasedPoints: 2 },
      };

      const mockResponse = {
        success: true as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {} as any, // Response type is complex, just verify the call works
      };

      vi.mocked(mockApiClient.patch).mockResolvedValue(mockResponse);

      const result = await characterService.updateAttribute("char123", "courage", updateData, "token123");

      expect(result.success).toBe(true);
      expect(mockApiClient.patch).toHaveBeenCalledWith("characters/char123/attributes/courage", updateData, "token123");
    });
  });

  describe("cloneCharacter", () => {
    it("should clone character successfully", async () => {
      const cloneData = {
        userIdOfCharacter: "user123",
      };

      const mockResponse = {
        success: true as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {} as any, // Response type is complex, just verify the call works
      };

      vi.mocked(mockApiClient.post).mockResolvedValue(mockResponse);

      const result = await characterService.cloneCharacter("char123", cloneData, "token123");

      expect(result.success).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith("characters/char123/clone", cloneData, "token123");
    });
  });
});
