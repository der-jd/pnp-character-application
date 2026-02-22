import { vi } from "vitest";
import { Result, ResultSuccess, ResultError, ApiError, createApiError } from "../lib/types/result";
import { Character } from "api-spec";

/**
 * Test utilities for mocking services and creating test data
 */

// Mock API Client
export function createMockApiClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

// Mock Character Service
export function createMockCharacterService() {
  return {
    getCharacter: vi.fn(),
    getAllCharacters: vi.fn(),
    updateSkill: vi.fn(),
    updateAttribute: vi.fn(),
    updateBaseValue: vi.fn(),
    updateCombatStats: vi.fn(),
    levelUp: vi.fn(),
    createCharacter: vi.fn(),
    cloneCharacter: vi.fn(),
    addSpecialAbility: vi.fn(),
    updateCalculationPoints: vi.fn(),
  };
}

// Mock History Service
export function createMockHistoryService() {
  return {
    getHistory: vi.fn(),
    deleteHistoryEntry: vi.fn(),
  };
}

// Test Data Factories
/**
 * Creates a test character - we'll use the real Character type from api-spec
 * but create it via JSON parsing to avoid TypeScript complexity
 */
export function createTestCharacter(overrides: Partial<Character> = {}): Character {
  // Use JSON parsing to create a valid Character object without TypeScript complexity
  const baseJson = {
    userId: "test-user-id",
    characterId: "test-character-id",
    characterSheet: {
      generalInformation: {
        name: "Test Character",
        level: 1,
        sex: "male",
        profession: { name: "Test Profession", skill: "test-skill" },
        hobby: { name: "Test Hobby", skill: "test-hobby-skill" },
        birthday: "1990-01-01",
        birthplace: "Test City",
        size: "180 cm",
        weight: "75 kg",
        hairColor: "brown",
        eyeColor: "blue",
        residence: "Test Town",
        appearance: "Test appearance",
        specialCharacteristics: "Test characteristics",
      },
      attributes: {
        courage: { start: 10, current: 10, mod: 0, totalCost: 0 },
        intelligence: { start: 10, current: 10, mod: 0, totalCost: 0 },
        concentration: { start: 10, current: 10, mod: 0, totalCost: 0 },
        dexterity: { start: 10, current: 10, mod: 0, totalCost: 0 },
        agility: { start: 10, current: 10, mod: 0, totalCost: 0 },
        charisma: { start: 10, current: 10, mod: 0, totalCost: 0 },
        fingerdexterity: { start: 10, current: 10, mod: 0, totalCost: 0 },
        strength: { start: 10, current: 10, mod: 0, totalCost: 0 },
      },
      baseValues: {
        healthPoints: { start: 30, current: 30, mod: 0 },
        mentalHealth: { start: 30, current: 30, mod: 0 },
        endurancePoints: { start: 30, current: 30, mod: 0 },
        magicResistance: { start: 4, current: 4, mod: 0 },
        socialStatus: { start: 1, current: 1, mod: 0 },
        magicPoints: { start: 0, current: 0, mod: 0 },
        divineGrace: { start: 0, current: 0, mod: 0 },
        legendaryActions: { start: 0, current: 0, mod: 0 },
      },
      combat: {
        // Simplified combat structure - we'll let JSON parsing handle the details
        melee: {},
        ranged: {},
      },
      skills: {
        combat: {},
        physical: {},
        social: {},
        mental: {},
        handcraft: {},
      },
      specialAbilities: [],
    },
  };

  // Simple merge - for complex nested testing, use specific override helpers
  return {
    ...baseJson,
    ...overrides,
  } as Character;
}

/**
 * Simple character for basic testing - doesn't need full Character structure
 */
export function createSimpleTestCharacter() {
  return {
    userId: "test-user-id",
    characterId: "test-character-id",
    characterSheet: {
      generalInformation: {
        name: "Test Character",
        level: 1,
      },
      attributes: {
        strength: { current: 10 },
        dexterity: { current: 10 },
      },
      skills: {
        combat: {
          swords: { current: 8, start: 6 },
        },
      },
    },
  };
}

// Result helpers
export function createSuccessResult<T>(data: T): Result<T, ApiError> {
  return ResultSuccess(data);
}

export function createErrorResult<T = unknown>(message: string): Result<T, ApiError> {
  return ResultError(createApiError(message, 400, "/test", "GET"));
}

export function createApiErrorResult<T = unknown>(
  message: string,
  statusCode: number = 400,
  endpoint: string = "/test",
  method: string = "GET"
): Result<T, ApiError> {
  return ResultError(createApiError(message, statusCode, endpoint, method));
}

// Common test scenarios
export const TEST_SCENARIOS = {
  VALID_CHARACTER_ID: "test-character-123",
  VALID_USER_ID: "test-user-456",
  VALID_ID_TOKEN: "mock-jwt-token",
  INVALID_CHARACTER_ID: "invalid-id",
  NETWORK_ERROR: "Network request failed",
  AUTH_ERROR: "Unauthorized",
};

// Mock implementations for common scenarios
export function setupSuccessfulCharacterService(character: Character) {
  return {
    getCharacter: vi.fn().mockResolvedValue(createSuccessResult(character)),
    getAllCharacters: vi.fn().mockResolvedValue(createSuccessResult([character])),
    updateSkill: vi.fn().mockResolvedValue(createSuccessResult({})),
    updateAttribute: vi.fn().mockResolvedValue(createSuccessResult({})),
    updateBaseValue: vi.fn().mockResolvedValue(createSuccessResult({})),
    updateCombatStats: vi.fn().mockResolvedValue(createSuccessResult({})),
    levelUp: vi.fn().mockResolvedValue(createSuccessResult({})),
    createCharacter: vi.fn().mockResolvedValue(createSuccessResult(character)),
    cloneCharacter: vi.fn().mockResolvedValue(createSuccessResult(character)),
    addSpecialAbility: vi.fn().mockResolvedValue(createSuccessResult({})),
    updateCalculationPoints: vi.fn().mockResolvedValue(createSuccessResult({})),
  };
}

export function setupFailingCharacterService(errorMessage: string) {
  const error = createErrorResult(errorMessage);
  return {
    getCharacter: vi.fn().mockResolvedValue(error),
    getAllCharacters: vi.fn().mockResolvedValue(error),
    updateSkill: vi.fn().mockResolvedValue(error),
    updateAttribute: vi.fn().mockResolvedValue(error),
    updateBaseValue: vi.fn().mockResolvedValue(error),
    updateCombatStats: vi.fn().mockResolvedValue(error),
    levelUp: vi.fn().mockResolvedValue(error),
    createCharacter: vi.fn().mockResolvedValue(error),
    cloneCharacter: vi.fn().mockResolvedValue(error),
    addSpecialAbility: vi.fn().mockResolvedValue(error),
    updateCalculationPoints: vi.fn().mockResolvedValue(error),
  };
}
