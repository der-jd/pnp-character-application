import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LevelUpUseCase } from '../lib/application/use-cases/LevelUpUseCase'
import { CharacterService } from '../lib/services/characterService'
import { 
  createSuccessResult,
  createErrorResult,
  TEST_SCENARIOS 
} from './test-utils'

// Mock the CharacterService
vi.mock('../lib/services/characterService')

describe('LevelUpUseCase', () => {
  let useCase: LevelUpUseCase
  let mockCharacterService: CharacterService
  
  beforeEach(() => {
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

    useCase = new LevelUpUseCase(mockCharacterService)
  })

  describe('Input Validation', () => {
    it('should reject empty character ID', async () => {
      const result = await useCase.execute({
        characterId: '',
        currentLevel: 1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Character ID is required')
      }
    })

    it('should reject invalid current level', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 0,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Level must be positive')
      }
    })

    it('should reject empty ID token', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 1,
        idToken: ''
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Authentication token is required')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      vi.mocked(mockCharacterService.levelUp).mockResolvedValue(
        createErrorResult('Level up failed')
      )

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        currentLevel: 1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Level up failed')
      }
    })
  })
})