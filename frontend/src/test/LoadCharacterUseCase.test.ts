import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import { LoadCharacterUseCase } from '../lib/application/use-cases/LoadCharacterUseCase'
import { CharacterService } from '../lib/services/characterService'
import { 
  createSuccessResult,
  createErrorResult,
  TEST_SCENARIOS 
} from './test-utils'

// Mock the CharacterService
vi.mock('../lib/services/characterService')

describe('LoadCharacterUseCase', () => {
  let mockCharacterService: MockedFunction<any>
  let useCase: LoadCharacterUseCase

  beforeEach(() => {
    // Create a properly mocked CharacterService
    mockCharacterService = {
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
      deleteCharacter: vi.fn(),
      apiClient: {} as any
    } as any

    useCase = new LoadCharacterUseCase(mockCharacterService)
  })

  describe('Input Validation', () => {
    it('should reject empty character ID', async () => {
      const result = await useCase.execute({
        characterId: '',
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Character ID is required')
      }
    })

    it('should reject empty ID token', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: ''
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Authentication token is required')
      }
    })
  })

  describe('Business Logic', () => {
    it('should successfully load character when valid input provided', async () => {
      // Arrange
      const mockCharacter = {
        userId: 'test-user',
        characterId: 'test-char',
        characterSheet: {
          generalInformation: { name: 'Test Character', level: 1 }
        }
      } as any

      mockCharacterService.getCharacter.mockResolvedValue(
        createSuccessResult(mockCharacter)
      )

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.character).toEqual(mockCharacter)
      }
      expect(mockCharacterService.getCharacter).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        TEST_SCENARIOS.VALID_ID_TOKEN
      )
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockCharacterService.getCharacter.mockResolvedValue(
        createErrorResult('Character not found')
      )

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.INVALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to load character')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      // Arrange
      mockCharacterService.getCharacter.mockRejectedValue(
        new Error('Network error')
      )

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Network error')
      }
    })
  })
})